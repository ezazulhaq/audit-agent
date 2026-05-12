import { Injectable, signal, effect, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, setDoc, updateDoc, query, where, Timestamp, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';
import { Audit, Vulnerability } from '../models/audit.models';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private platformId = inject(PLATFORM_ID);
  
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;

  // Signals for state
  public user = signal<User | null>(null);
  public isAuthReady = signal<boolean>(false);
  
  public activeAudits = signal<Audit[]>([]);
  public currentAudit = signal<Audit | null>(null);
  public currentVulns = signal<Vulnerability[]>([]);
  
  public error = signal<string | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app, firebaseConfig.firestoreDatabaseId);
      this.initAuth();
    } else {
      this.isAuthReady.set(true); // Don't block SSR on auth
    }
  }

  private initAuth() {
    if (!this.auth) return;
    onAuthStateChanged(this.auth, (user) => {
      this.user.set(user);
      this.isAuthReady.set(true);
      if (user) {
        this.subscribeToAudits(user.uid);
      } else {
        this.activeAudits.set([]);
      }
    });
  }

  public async login() {
    if (!this.auth) return;
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(this.auth, provider);
    } catch (err: any) {
      this.error.set(err.message);
    }
  }

  public async logout() {
    if (!this.auth) return;
    await this.auth.signOut();
  }

  private subscribeToAudits(userId: string) {
    if (!this.db) return;
    const auditsRef = collection(this.db, 'audits');
    const q = query(auditsRef, where('createdBy', '==', userId));
    
    onSnapshot(q, (snapshot) => {
      const audits: Audit[] = [];
      snapshot.forEach(docSnap => {
        audits.push({ id: docSnap.id, ...docSnap.data() } as Audit);
      });
      // Sort by active / newest
      audits.sort((a, b) => b.updatedAt - a.updatedAt);
      this.activeAudits.set(audits);
    }, (error) => {
      this.error.set(error.message);
    });
  }

  public subscribeToAuditDetails(auditId: string) {
    if (!this.db) return () => {};
    const docRef = doc(this.db, 'audits', auditId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const audit = { id: docSnap.id, ...docSnap.data() } as Audit;
        this.currentAudit.set(audit);
        // Assuming vulnerabilities are stored inside the audit doc for simplicity based on python backend code:
        // 'vulnerabilities' is a field in AuditState.
        const vulns = (docSnap.data() as any)['vulnerabilities'] || [];
        this.currentVulns.set(vulns as Vulnerability[]);
      }
    }, (error) => {
      this.error.set(error.message);
    });
  }

  public async createAudit(githubUrl: string) {
    if (!this.db) return null;
    const user = this.user();
    if (!user) {
      this.error.set('Must be logged in to create audit');
      return;
    }

    try {
      // Validation: Check if any repository is already under scan
      const activeScan = this.activeAudits().find(a => 
        ['PENDING', 'SCANNING', 'AWAITING_APPROVAL', 'PATCHING'].includes(a.status)
      );

      if (activeScan) {
        this.error.set('A scan is already in progress. Please wait for it to complete or cancel it.');
        return null;
      }
      this.error.set(null); // Clear previous errors

      const auditsRef = collection(this.db, 'audits');
      const newDocRef = doc(auditsRef);
      const newAudit: Audit = {
        githubUrl,
        status: 'PENDING',
        createdBy: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await setDoc(newDocRef, newAudit);
      return newDocRef.id;
    } catch (err: any) {
      this.error.set('Failed to create audit: ' + err.message);
      return null;
    }
  }

  public async approveFix(auditId: string, vulnId: string, vulnerabilities: Vulnerability[]) {
    if (!this.db) return;
    try {
      const auditRef = doc(this.db, 'audits', auditId);
      
      const updatedVulns = vulnerabilities.map(v => 
        v.id === vulnId ? { ...v, status: 'APPROVED' } : v
      );
      
      await updateDoc(auditRef, {
        status: 'PATCHING', // Trigger the backend resume
        vulnerabilities: updatedVulns,
        updatedAt: Date.now()
      });
    } catch (err: any) {
        this.error.set('Failed to approve fix: ' + err.message);
    }
  }

  public async rejectFix(auditId: string, vulnId: string, vulnerabilities: Vulnerability[]) {
    if (!this.db) return;
    try {
      const auditRef = doc(this.db, 'audits', auditId);
      
      const updatedVulns = vulnerabilities.map(v => 
        v.id === vulnId ? { ...v, status: 'REJECTED' } : v
      );
      
      // We could set status to something else or remain AWAITING_APPROVAL 
      // if there are more vulnerabilities to approve.
      await updateDoc(auditRef, {
        vulnerabilities: updatedVulns,
        updatedAt: Date.now()
      });
    } catch (err: any) {
        this.error.set('Failed to reject fix: ' + err.message);
    }
  }

  public async deleteAudit(auditId: string) {
    if (!this.db) return;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      const auditRef = doc(this.db, 'audits', auditId);
      await deleteDoc(auditRef);
    } catch (err: any) {
      this.error.set('Failed to delete audit: ' + err.message);
    }
  }

  public async cancelAudit(auditId: string) {
    if (!this.db) return;
    try {
      const auditRef = doc(this.db, 'audits', auditId);
      await updateDoc(auditRef, {
        status: 'CANCELLED',
        progressMessage: 'Scan Cancelled',
        updatedAt: Date.now()
      });
    } catch (err: any) {
      this.error.set('Failed to cancel audit: ' + err.message);
    }
  }
}
