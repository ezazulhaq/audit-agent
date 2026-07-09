import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, setDoc, updateDoc, query, where, Firestore } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import firebaseConfig from '../../../firebase-applet-config.json';
import { Audit, Vulnerability } from '../models/audit.models';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private platformId = inject(PLATFORM_ID);
  private toastService = inject(ToastService);
  
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private storage: FirebaseStorage | null = null;

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
      this.storage = getStorage(this.app);
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
      this.toastService.success('Logged in successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
      this.toastService.error(`Login failed: ${msg}`);
    }
  }

  public async logout() {
    if (!this.auth) return;
    await this.auth.signOut();
    this.toastService.info('Logged out');
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
    if (!this.db) return () => { return; };
    const docRef = doc(this.db, 'audits', auditId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const audit = { id: docSnap.id, ...docSnap.data() } as Audit;
        this.currentAudit.set(audit);
        // Assuming vulnerabilities are stored inside the audit doc for simplicity based on python backend code:
        // 'vulnerabilities' is a field in AuditState.
        const auditData = docSnap.data() as Audit;
        const vulns = auditData?.vulnerabilities || [];
        this.currentVulns.set(vulns);
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
      this.toastService.error('Must be logged in to create audit');
      return;
    }

    try {
      // Validation: Check if any repository is already under scan
      const activeScan = this.activeAudits().find(a => 
        ['PENDING', 'SCANNING', 'AWAITING_APPROVAL', 'PATCHING'].includes(a.status)
      );

      if (activeScan) {
        this.error.set('A scan is already in progress. Please wait for it to complete or cancel it.');
        this.toastService.warning('A scan is already in progress');
        return null;
      }
      this.error.set(null); // Clear previous errors

      const auditsRef = collection(this.db, 'audits');
      const newDocRef = doc(auditsRef);
      const newAudit: Audit = {
        githubUrl,
        status: 'SCANNING',
        progressMessage: 'Initializing Node.js Analysis Pipeline...',
        createdBy: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await setDoc(newDocRef, newAudit);
      this.toastService.info('Started scanning repository');
      
      // Kick off background analysis (don't await it so we can return the ID)
      this.runAnalysis(newDocRef.id, githubUrl);
      
      return newDocRef.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set('Failed to create audit: ' + msg);
      this.toastService.error('Failed to create audit');
      return null;
    }
  }

  private async runAnalysis(auditId: string, githubUrl: string) {
    if (!this.db) return;
    try {
      const res = await fetch('/api/analyze-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId, githubUrl })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      await updateDoc(doc(this.db, 'audits', auditId), {
        status: 'AWAITING_APPROVAL',
        vulnerabilities: data.vulnerabilities,
        progressMessage: 'Analysis complete. Waiting for approval.',
        updatedAt: Date.now()
      });
      this.toastService.success('Analysis complete');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await updateDoc(doc(this.db, 'audits', auditId), {
        status: 'FAILED',
        error: msg,
        updatedAt: Date.now()
      });
      this.toastService.error(`Analysis failed: ${msg}`);
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
        status: 'PATCHING', // Trigger the frontend loading state
        vulnerabilities: updatedVulns,
        progressMessage: 'Applying patches to repository...',
        updatedAt: Date.now()
      });
      this.toastService.info('Applying fix...');
      
      // Call backend to patch
      const res = await fetch('/api/patch-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vulnerabilities: updatedVulns })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      let reportUrl = data.reportUrl || '';
      
      if (data.reportContent && this.storage) {
         try {
           const reportRef = ref(this.storage, `reports/${auditId}-${Date.now()}.md`);
           await uploadString(reportRef, data.reportContent, 'raw', { contentType: 'text/markdown' });
           reportUrl = await getDownloadURL(reportRef);
         } catch (e) {
           console.error('Failed to upload report to storage:', e);
           // Fallback to empty or simulated
           reportUrl = data.reportUrl || '';
         }
      }
      
      await updateDoc(auditRef, {
        status: data.status, // Should be COMPLETED
        reportUrl: reportUrl,
        progressMessage: 'Patching complete.',
        updatedAt: Date.now()
      });
      this.toastService.success('Fix applied successfully');
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set('Failed to approve fix: ' + msg);
      this.toastService.error(`Failed to apply fix: ${msg}`);
      await updateDoc(doc(this.db, 'audits', auditId), {
        status: 'FAILED',
        error: msg,
        updatedAt: Date.now()
      });
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
      this.toastService.info('Fix rejected');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set('Failed to reject fix: ' + msg);
      this.toastService.error('Failed to reject fix');
    }
  }

  public async deleteAudit(auditId: string) {
    if (!this.db) return;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      const auditRef = doc(this.db, 'audits', auditId);
      await deleteDoc(auditRef);
      this.toastService.success('Audit deleted');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set('Failed to delete audit: ' + msg);
      this.toastService.error('Failed to delete audit');
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
      this.toastService.info('Audit cancelled');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set('Failed to cancel audit: ' + msg);
      this.toastService.error('Failed to cancel audit');
    }
  }
}
