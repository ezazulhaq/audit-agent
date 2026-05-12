import { Component, ChangeDetectionStrategy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditService } from './services/audit.service';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 bg-[#050505] text-[#e0e0e0] font-sans flex flex-col overflow-hidden">
      <!-- Top Navigation Bar -->
      <header class="h-16 border-b border-white/10 px-8 flex shrink-0 items-center justify-between bg-[#0a0a0a]">
        <div class="flex items-center gap-4">
          <div class="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center">
            <div class="w-4 h-4 border-2 border-black"></div>
          </div>
          <h1 class="text-lg font-semibold tracking-tight text-white">Intelligent <span class="text-emerald-500">Compliance</span> Agent</h1>
          <div class="h-4 w-[1px] bg-white/20 mx-2"></div>
          <span class="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">V2.4.0 CORE_LIVE</span>
        </div>

        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2">
            @if (auditService.isAuthReady()) {
               @if (auditService.user()) {
                 <div class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                 <span class="text-xs font-medium uppercase tracking-widest text-white/60">Firestore Sync: Active</span>
               } @else {
                 <div class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                 <span class="text-xs font-medium uppercase tracking-widest text-white/60">Disconnected</span>
               }
            } @else {
                 <div class="w-2 h-2 rounded-full bg-zinc-500"></div>
                 <span class="text-xs font-medium uppercase tracking-widest text-white/60">Connecting...</span>
            }
          </div>
          
          <div class="flex items-center gap-3 border-l border-white/10 pl-6">
            @if (auditService.user()) {
               <div class="text-right">
                  <p class="text-xs font-semibold text-white">{{ auditService.user()?.displayName || 'Principal Architect' }}</p>
                  <button (click)="logout()" class="text-[10px] text-white/40 uppercase tracking-tighter hover:text-white transition-colors cursor-pointer">Sign Out</button>
               </div>
               <img [src]="auditService.user()?.photoURL || ''" [alt]="auditService.user()?.displayName || ''" referrerpolicy="no-referrer" class="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/20" />
            } @else {
               <div class="text-right">
                 <button (click)="login()" class="px-3 py-1 bg-white/5 border border-white/10 rounded uppercase tracking-widest text-xs font-medium hover:bg-white/10 transition-colors cursor-pointer">Sign In</button>
               </div>
            }
          </div>
        </div>
      </header>

      <main class="flex-1 flex overflow-hidden">
        <!-- Sidebar: Active Audits -->
        <aside class="w-80 border-r border-white/10 bg-[#080808] flex flex-col shrink-0">
          <div class="p-6">
             <p class="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">Active Scans ({{ audits().length }})</p>
             <div class="space-y-3">
               @for (audit of audits(); track audit.id) {
                 <div 
                   (click)="selectAudit(audit.id!)"
                   class="p-3 rounded-lg cursor-pointer transition-colors"
                   [ngClass]="{
                     'bg-emerald-500/10 border border-emerald-500/30 ring-1 ring-emerald-500/20': auditId() === audit.id,
                     'bg-white/5 border border-white/10 hover:bg-white/10': auditId() !== audit.id && audit.status !== 'FAILED',
                     'bg-red-500/5 border border-red-500/20 opacity-80': audit.status === 'FAILED'
                   }">
                   
                   <p class="text-sm font-medium" [ngClass]="auditId() === audit.id ? 'text-emerald-100' : 'text-white'">
                     {{ getRepoName(audit.githubUrl) }}
                   </p>
                   
                   <div class="flex items-center justify-between mt-1">
                     <p class="text-[10px] text-white/40 uppercase tracking-tight truncate max-w-[150px]">
                       {{ audit.status === 'AWAITING_APPROVAL' ? 'Awaiting HITL Approval' : audit.status === 'SCANNING' ? 'Scanner Node: Active' : audit.status === 'PATCHING' ? 'Applying Patch...' : audit.status }}
                     </p>
                     @if(audit.error) {
                        <mat-icon class="text-red-500 !w-3 !h-3 text-[12px] opacity-70">error</mat-icon>
                     }
                   </div>
                   
                   @if (audit.status === 'SCANNING') {
                     <div class="mt-2 w-full bg-white/10 h-1 flex rounded-full overflow-hidden relative">
                       <div class="bg-emerald-500 w-1/3 h-1 rounded-full absolute animate-[shimmer_1.5s_infinite]"></div>
                     </div>
                   } @else if (audit.status === 'AWAITING_APPROVAL') {
                     <div class="mt-2 flex gap-1">
                       <div class="h-1 w-1/4 bg-emerald-500 rounded-full"></div>
                       <div class="h-1 w-1/4 bg-emerald-500 rounded-full"></div>
                       <div class="h-1 w-1/4 bg-emerald-500 rounded-full animate-pulse"></div>
                       <div class="h-1 w-1/4 bg-white/10 rounded-full"></div>
                     </div>
                   } @else if (audit.status === 'COMPLETED') {
                     <div class="mt-2 w-full bg-white/10 h-1 rounded-full">
                       <div class="bg-emerald-500 w-full h-1 rounded-full"></div>
                     </div>
                     <p class="text-[10px] mt-1 text-emerald-400">Report Generated</p>
                   }
                 </div>
               }

               @if(audits().length === 0 && auditService.user()) {
                 <div class="p-4 text-center border border-white/5 border-dashed rounded-lg">
                    <p class="text-xs text-white/40 mb-2">No active audits.</p>
                 </div>
               }
             </div>
          </div>
          
          <div class="mt-auto px-6 pb-6">
             <!-- New Audit Input form -->
             <div class="space-y-2">
                <input type="text" [(ngModel)]="newRepoUrl" placeholder="Enter GitHub URL to Scan..." class="w-full bg-[#121212] border border-white/10 rounded px-3 py-2 text-xs font-mono text-white/80 focus:outline-none focus:border-emerald-500/50" />
                <button (click)="createNewAudit()" [disabled]="!newRepoUrl || !auditService.user()" class="w-full bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-[10px] font-bold py-2 rounded transition-colors cursor-pointer flex justify-center items-center gap-2">
                   <mat-icon class="!w-4 !h-4 text-[16px] flex items-center justify-center">add_circle</mat-icon>
                   Start Analysis
                </button>
             </div>
             
             @if (auditService.error()) {
                <div class="mt-2 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-xs">
                   {{ auditService.error() }}
                </div>
             }
          </div>
          
          <div class="p-4 mt-2 bg-gradient-to-t from-white/5 to-transparent border-t border-white/10">
            <p class="text-xs text-white/60 mb-2 italic tracking-wide">"Gemini 2.5 Flash-Lite processing 1.4M tokens per second in background..."</p>
          </div>
        </aside>

        <!-- Main Workspace -->
        <section class="flex-1 flex flex-col p-8 bg-[#050505] overflow-y-auto w-full">
          @if (currentAudit()) {
             <div class="flex justify-between items-start mb-6 shrink-0">
               <div class="flex-1 pr-6 truncate">
                 <h2 class="text-3xl font-light text-white truncate w-full flex items-center gap-3">
                    Audit <span class="text-emerald-500 font-mono tracking-tighter text-2xl">#{{ currentAudit()?.id?.substring(0, 6) }}</span>
                    @if(currentAudit()?.status === 'COMPLETED') {
                        <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs tracking-widest uppercase border border-emerald-500/30 rounded inline-block ml-3 transform -translate-y-1">Clean</span>
                    }
                 </h2>
                 <p class="text-white/40 font-mono text-sm mt-1 truncate">{{ currentAudit()?.githubUrl }}</p>
               </div>
               
               <div class="flex flex-col items-end shrink-0 gap-2">
                 @if(currentAudit()?.reportUrl) {
                    <a [href]="currentAudit()?.reportUrl" target="_blank" class="px-4 py-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 rounded text-xs font-bold uppercase tracking-widest hover:bg-emerald-500/20 flex items-center gap-2 transition-colors cursor-pointer">
                      <mat-icon class="!w-4 !h-4 text-[16px] flex items-center justify-center">download</mat-icon>
                      Download Audit Report
                    </a>
                 }
                 
                 <!-- Status Pills -->
                 <span class="text-xs font-mono px-3 py-1 bg-white/5 border border-white/10 rounded text-white/60">
                   Status: {{ currentAudit()?.status }}
                 </span>
               </div>
             </div>
             
             <!-- Show the First Vulnerability (for prototype simplicity) -->
             @if (vulns().length > 0) {
               @for(vuln of vulns(); track vuln.id) {
               <div class="mb-4">
               <div class="flex justify-between items-end mb-4">
                 <div>
                    <h3 class="text-xl font-light text-white">Vulnerability Analysis <span class="text-emerald-500 font-mono text-sm opacity-60">ID:{{ vuln.id || 'N/A' }}</span></h3>
                    <p class="text-white/40 font-mono text-sm mt-1">Source: Semgrep | {{ vuln.type }}</p>
                 </div>
                 @if (vuln.status === 'PENDING' && currentAudit()?.status === 'AWAITING_APPROVAL') {
                   <div class="flex gap-3">
                     <button (click)="rejectFix(vuln.id!)" class="px-4 py-2 border border-red-500/50 text-red-400 rounded text-xs font-bold uppercase tracking-widest hover:bg-red-500/10 cursor-pointer transition-colors shadow-sm">Reject Fix</button>
                     <button (click)="approveFix(vuln.id!)" class="px-8 py-2 bg-emerald-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer transition-all">Approve & Patch</button>
                   </div>
                 } @else {
                   <div class="h-[36px] flex items-center">
                     <span class="text-xs uppercase tracking-widest text-white/40 px-4 py-1.5 border border-white/10 rounded bg-[#121212]">
                       Fix Status: {{ vuln.status }}
                     </span>
                   </div>
                 }
               </div>

               <div class="grid grid-cols-12 gap-6 items-stretch">
                 <!-- Code Comparison / Diff -->
                 <div class="col-span-8 flex flex-col bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden shadow-2xl h-full">
                   <div class="h-10 bg-[#121212] border-b border-white/5 px-4 flex items-center justify-between shrink-0">
                     <span class="text-[10px] font-mono text-white/40 uppercase tracking-widest truncate pr-4">File: {{ vuln.file }}</span>
                     <span class="text-[10px] font-mono shrink-0" [ngClass]="vuln.status === 'APPROVED' ? 'text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded' : 'text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded'">
                        {{ vuln.status === 'APPROVED' ? 'Fix Applied' : 'Proposed Gemini Fix' }}
                     </span>
                   </div>
                   <div class="flex-1 font-mono text-xs p-6 leading-relaxed overflow-x-auto relative">
                     <!-- In a real app we'd compute diff properly, we simulate here for the prototype UI based on design specs -->
                      <div class="flex gap-4 bg-red-500/5 -mx-6 px-6 py-1 group hover:bg-red-500/10 transition-colors border-l-2 border-red-500/40">
                       <span class="w-8 text-right text-red-500/60 select-none group-hover:text-red-500">{{ vuln.line }}</span>
                       <span class="text-red-200/80 group-hover:text-red-200">-  Original vulnerable code detected here</span>
                     </div>
                     
                     <div class="mt-4 p-4 bg-zinc-900/50 rounded-lg border border-white/5 space-y-2">
                       <p class="text-xs text-white/40 uppercase tracking-widest select-none">Gemini Fix Snippet:</p>
                       <pre class="text-emerald-300 font-mono whitespace-pre-wrap leading-tight text-xs">{{ vuln.proposedFixSnippet }}</pre>
                     </div>
                     
                      <div class="mt-6 p-4 bg-[#121212] rounded-lg border border-white/5">
                       <p class="text-[10px] text-white/50 mb-1 uppercase tracking-widest font-sans font-semibold">Semgrep Context:</p>
                       <p class="text-xs text-zinc-400 font-sans leading-snug">{{ vuln.description }}</p>
                     </div>
                   </div>
                 </div>

                 <!-- Analysis Details -->
                 <div class="col-span-4 flex flex-col gap-6 h-full">
                   <div class="bg-white/5 border border-white/10 rounded-xl p-6 flex-1 h-auto">
                     <h3 class="text-xs uppercase tracking-[0.2em] text-white/40 mb-4 font-semibold">Vulnerability Metadata</h3>
                     <div class="space-y-5">
                       <div>
                         <p class="text-[10px] text-white/40 uppercase tracking-wider mb-1">Severity</p>
                         <p class="text-red-400 font-bold uppercase tracking-tighter text-xl">{{ vuln.severity }}</p>
                       </div>
                       <div>
                         <p class="text-[10px] text-white/40 uppercase tracking-wider mb-2">Compliance Domain</p>
                         <div class="flex flex-wrap gap-2">
                           <!-- Simulation tags -->
                           <span class="px-2 py-0.5 bg-zinc-800 rounded text-[10px] border border-white/10 uppercase text-zinc-300">SOC2</span>
                           <span class="px-2 py-0.5 bg-zinc-800 rounded text-[10px] border border-white/10 uppercase text-zinc-300">GDPR</span>
                           <span class="px-2 py-0.5 bg-zinc-800 rounded text-[10px] border border-white/10 uppercase text-zinc-300">HIPAA</span>
                         </div>
                       </div>
                       <div class="pt-5 border-t border-white/10">
                         <p class="text-[10px] text-white/40 uppercase tracking-wider mb-1">Scanner Node</p>
                         <p class="text-xs font-mono text-zinc-400">Semgrep Python/Firebase GCP</p>
                       </div>
                     </div>
                   </div>

                   <div class="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 shrink-0 h-auto">
                      <h3 class="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-400/60 mb-2">Workflow Intelligence</h3>
                      <p class="text-xs text-emerald-100/90 leading-relaxed">
                        The LangGraph <strong class="text-emerald-400 font-mono px-1 bg-emerald-500/10 rounded text-[10px]">AnalyzerNode</strong> has validated this fix against knowledge base patches with a high success rate.
                      </p>
                   </div>
                 </div>
               </div>
               
               </div>
               }
             }

          } @else {
             <div class="flex-1 flex items-center justify-center flex-col text-center opacity-60">
                <mat-icon class="!w-16 !h-16 text-[64px] text-white/20 mb-6">shield</mat-icon>
                <h2 class="text-2xl font-light text-white mb-2">No Audit Selected</h2>
                <p class="text-sm text-white/40 max-w-md">Select an active scan from the sidebar to view vulnerabilities, AI analysis, and patch recommendations.</p>
             </div>
          }
        </section>
      </main>

      <!-- Bottom Console Status -->
      <footer class="h-10 border-t border-white/10 bg-[#0a0a0a] px-8 flex shrink-0 items-center justify-between text-[10px] font-mono tracking-wider text-white/40">
        <div class="flex gap-8">
          <div class="flex items-center gap-2">
            @if (currentAudit()?.status === 'AWAITING_APPROVAL') {
               <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
               <span class="text-amber-500">AGENT_STREAM: IDLE_WAIT_APPROVAL</span>
            } @else if (currentAudit()?.status === 'PATCHING') {
               <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               <span class="text-emerald-500">AGENT_STREAM: EXEC_PATCH</span>
            } @else if (currentAudit()?.status === 'SCANNING') {
               <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
               <span class="text-blue-400">AGENT_STREAM: ACTIVE_SCAN</span>
            } @else {
               <span class="w-1.5 h-1.5 rounded-full bg-white/20"></span>
               <span>AGENT_STREAM: IDLE</span>
            }
          </div>
          <div class="flex items-center gap-2">
            <span class="opacity-50">CHECKPOINT_UID:</span>
            <span class="text-white/80">{{ currentAudit()?.id || '----------' | slice:0:12 }}</span>
          </div>
        </div>
        <div class="flex gap-8 items-center">
          <div class="flex items-center gap-2 opacity-50">
            <span>LATENCY: 142ms</span>
          </div>
          <div class="px-3 py-1 bg-white/5 rounded border border-white/10 text-white/60">
            SYSTEM_STATUS: NOMINAL
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(300%); }
    }
  `]
})
export class DashboardComponent {
  auditService = inject(AuditService);
  
  audits = this.auditService.activeAudits;
  currentAudit = this.auditService.currentAudit;
  vulns = this.auditService.currentVulns;
  
  auditId = signal<string | null>(null);
  
  newRepoUrl = '';
  
  // Clean up unsubscribes in real app
  currentAuditSub: any;

  constructor() {
     // Effect to auto-select first audit if none selected
     effect(() => {
        const _audits = this.audits();
        if (_audits.length > 0 && !this.auditId()) {
           this.selectAudit(_audits[0].id!);
        }
     });
  }

  getRepoName(url: string) {
     try {
       const u = new URL(url);
       const parts = u.pathname.split('/').filter(Boolean);
       if (parts.length >= 2) return parts[1];
       return url;
     } catch(e) {
       return url;
     }
  }

  selectAudit(id: string) {
     this.auditId.set(id);
     if (this.currentAuditSub) {
        this.currentAuditSub(); // unsubscribe
     }
     this.currentAuditSub = this.auditService.subscribeToAuditDetails(id);
  }

  async createNewAudit() {
     if (this.newRepoUrl.trim()) {
        const id = await this.auditService.createAudit(this.newRepoUrl.trim());
        if (id) {
           this.newRepoUrl = '';
           this.selectAudit(id);
        }
     }
  }

  async login() {
     await this.auditService.login();
  }
  
  async logout() {
     await this.auditService.logout();
     this.auditId.set(null);
     this.currentAudit.set(null);
     if (this.currentAuditSub) this.currentAuditSub();
  }

  approveFix(vulnId: string) {
     if (this.currentAudit()) {
        this.auditService.approveFix(this.currentAudit()!.id!, vulnId, this.vulns());
     }
  }

  rejectFix(vulnId: string) {
     if (this.currentAudit()) {
        this.auditService.rejectFix(this.currentAudit()!.id!, vulnId, this.vulns());
     }
  }
}
