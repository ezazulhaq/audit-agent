import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditService } from './services/audit.service';
import { MatIconModule } from '@angular/material/icon';
import { Audit } from './models/audit.models';
import packageJson from '../../package.json';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 bg-[#050505] text-[#e0e0e0] font-sans flex flex-col overflow-hidden">
      <!-- Top Navigation Bar -->
      <header class="h-16 border-b border-white/10 px-4 md:px-8 flex shrink-0 items-center justify-between bg-[#0a0a0a] z-30">
        <div class="flex items-center gap-2 md:gap-4">
          <!-- Mobile Menu Toggle Button -->
          <button 
            (click)="isMobileSidebarOpen.set(true)" 
            class="lg:hidden p-2 -ml-2 hover:bg-white/5 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer outline-none flex items-center justify-center"
            aria-label="Open navigation menu">
            <mat-icon class="!w-6 !h-6 text-[24px]">menu</mat-icon>
          </button>

          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <div class="w-4 h-4 border-2 border-black"></div>
            </div>
            <h1 class="text-sm sm:text-base md:text-lg font-semibold tracking-tight text-white flex items-center gap-1.5">
              <span class="hidden xs:inline">Intelligent</span>
              <span class="text-emerald-500">Compliance</span>
              <span class="hidden sm:inline">Agent</span>
            </h1>
            <div class="hidden md:block h-4 w-[1px] bg-white/20 mx-1"></div>
            <span class="hidden md:inline-block text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">V{{ version }}</span>
          </div>
        </div>

        <div class="flex items-center gap-4 md:gap-6">
          <div class="flex items-center gap-2">
            @if (auditService.isAuthReady()) {
               @if (auditService.user()) {
                 <div class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                 <span class="hidden sm:inline-block text-[10px] font-medium uppercase tracking-wider text-white/50">Sync Active</span>
               } @else {
                 <div class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                 <span class="hidden sm:inline-block text-[10px] font-medium uppercase tracking-wider text-white/50">Disconnected</span>
               }
            } @else {
                 <div class="w-2 h-2 rounded-full bg-zinc-500"></div>
                 <span class="hidden sm:inline-block text-[10px] font-medium uppercase tracking-wider text-white/50">Connecting...</span>
            }
          </div>
          
          <div class="flex items-center gap-3 border-l border-white/10 pl-4 md:pl-6">
            @if (auditService.user()) {
               <div class="text-right hidden sm:block">
                  <p class="text-xs font-semibold text-white truncate max-w-[120px]">{{ auditService.user()?.displayName || 'Principal Architect' }}</p>
                  <button (click)="logout()" class="text-[10px] text-white/40 uppercase tracking-wider hover:text-white transition-colors cursor-pointer outline-none">Sign Out</button>
               </div>
               <div class="relative group">
                 <img [src]="auditService.user()?.photoURL || ''" [alt]="auditService.user()?.displayName || ''" referrerpolicy="no-referrer" class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/20" />
                 <button (click)="logout()" class="sm:hidden absolute -bottom-1 -right-1 bg-red-500 hover:bg-red-600 text-white p-0.5 rounded-full border border-black shadow flex items-center justify-center transition-colors cursor-pointer outline-none" title="Sign Out">
                   <mat-icon class="!w-3 !h-3 text-[10px] flex items-center justify-center">logout</mat-icon>
                 </button>
               </div>
            } @else {
               <button (click)="login()" class="px-2.5 py-1.5 md:px-3 md:py-1.5 bg-white/5 border border-white/10 rounded uppercase tracking-wider text-[10px] md:text-xs font-semibold hover:bg-white/10 hover:border-white/20 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 outline-none">
                 <mat-icon class="!w-4 !h-4 text-[14px] flex items-center justify-center">login</mat-icon>
                 Sign In
               </button>
            }
          </div>
        </div>
      </header>

      <main class="flex-1 flex overflow-hidden relative">
        <!-- Mobile Sidebar Drawer (Slide-over) -->
        <div class="fixed inset-0 z-40 lg:hidden" [class.pointer-events-none]="!isMobileSidebarOpen()">
          <!-- Backdrop overlay -->
          <button 
            type="button"
            aria-label="Close sidebar"
            (click)="isMobileSidebarOpen.set(false)"
            class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 w-full h-full border-none cursor-pointer outline-none"
            [ngClass]="isMobileSidebarOpen() ? 'opacity-100' : 'opacity-0'">
          </button>
          
          <!-- Drawer Content -->
          <div 
            class="absolute inset-y-0 left-0 w-80 bg-[#080808] border-r border-white/10 flex flex-col transition-transform duration-300 ease-out shadow-2xl"
            [ngClass]="isMobileSidebarOpen() ? 'translate-x-0' : '-translate-x-full'">
            
            <!-- Drawer Header -->
            <div class="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-[#0a0a0a]">
              <div class="flex items-center gap-3">
                <div class="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
                  <div class="w-3 h-3 border-2 border-black"></div>
                </div>
                <span class="font-semibold text-white text-sm">Navigation</span>
              </div>
              <button 
                (click)="isMobileSidebarOpen.set(false)" 
                class="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors cursor-pointer outline-none">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <!-- Overview Tab Link -->
            <div class="p-4 border-b border-white/5">
              <button 
                (click)="deselectAudit(); isMobileSidebarOpen.set(false)" 
                class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                [ngClass]="{
                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.05)]': auditId() === null,
                  'text-white/60 hover:text-white hover:bg-white/5 border border-transparent': auditId() !== null
                }">
                <mat-icon class="!w-4 !h-4 text-[18px]">dashboard</mat-icon>
                Dashboard Overview
              </button>
            </div>

            <!-- Active Audits List -->
            <div class="p-6 flex-1 overflow-y-auto">
               <p class="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">Active Scans ({{ audits().length }})</p>
               <div class="space-y-3">
                 @for (audit of audits(); track audit.id) {
                   <button 
                     type="button"
                     (click)="selectAudit(audit.id!); isMobileSidebarOpen.set(false)"
                     class="w-full text-left p-3 rounded-lg cursor-pointer transition-all border border-transparent outline-none block"
                     [ngClass]="{
                       'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20': auditId() === audit.id,
                       'bg-white/5 border-white/10 hover:bg-white/10': auditId() !== audit.id && audit.status !== 'FAILED' && audit.status !== 'CANCELLED',
                       'bg-red-500/5 border-red-500/20 opacity-80': audit.status === 'FAILED' || audit.status === 'CANCELLED'
                     }">
                     
                     <p class="text-sm font-medium" [ngClass]="auditId() === audit.id ? 'text-emerald-100' : 'text-white'">
                       {{ getRepoName(audit.githubUrl) }}
                     </p>
                     
                     <div class="flex items-center justify-between mt-1">
                       <p class="text-[10px] text-white/40 uppercase tracking-tight truncate max-w-[150px]">
                         {{ audit.status === 'AWAITING_APPROVAL' ? 'Awaiting Approval' : (audit.status === 'SCANNING' || audit.status === 'PENDING') ? (audit.progressMessage || 'Initializing...') : audit.status === 'PATCHING' ? 'Applying Patch...' : audit.status }}
                       </p>
                       @if(audit.error) {
                          <mat-icon class="text-red-500 !w-3 !h-3 text-[12px] opacity-70">error</mat-icon>
                       }
                     </div>
                     
                     @if (audit.status === 'SCANNING' || audit.status === 'PENDING') {
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
                   </button>
                 }

                 @if(audits().length === 0 && auditService.user()) {
                   <div class="p-4 text-center border border-white/5 border-dashed rounded-lg">
                      <p class="text-xs text-white/40 mb-2">No active audits.</p>
                   </div>
                 }
               </div>
            </div>
            
            <!-- Drawer Footer with scan creator -->
            <div class="p-6 mt-auto border-t border-white/10 bg-[#0a0a0a]/50">
               <div class="space-y-2">
                  <input 
                    type="text" 
                    #mobileSidebarInput
                    (input)="newRepoUrl = mobileSidebarInput.value" 
                    [value]="newRepoUrl"
                    (keyup.enter)="createNewAudit(); isMobileSidebarOpen.set(false)"
                    placeholder="Enter GitHub URL to Scan..." 
                    class="w-full bg-[#121212] border border-white/10 rounded px-3 py-2 text-xs font-mono text-white/80 focus:outline-none focus:border-emerald-500/50" />
                  <button (click)="createNewAudit(); isMobileSidebarOpen.set(false)" [disabled]="!newRepoUrl || !auditService.user()" class="w-full bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-[10px] font-bold py-2.5 rounded transition-colors cursor-pointer flex justify-center items-center gap-2">
                     <mat-icon class="!w-4 !h-4 text-[16px] flex items-center justify-center">add_circle</mat-icon>
                     Start Analysis
                   </button>
               </div>
            </div>
          </div>
        </div>

        <!-- Sidebar: Active Audits (Desktop) -->
        <aside class="hidden lg:flex w-80 border-r border-white/10 bg-[#080808] flex-col shrink-0">
          <!-- Overview Tab Link -->
          <div class="p-4 border-b border-white/5">
            <button 
              (click)="deselectAudit()" 
              class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
              [ngClass]="{
                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.05)]': auditId() === null,
                'text-white/60 hover:text-white hover:bg-white/5 border border-transparent': auditId() !== null
              }">
              <mat-icon class="!w-4 !h-4 text-[18px]">dashboard</mat-icon>
              Dashboard Overview
            </button>
          </div>

          <div class="p-6 flex-1 overflow-y-auto">
             <p class="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">Active Scans ({{ audits().length }})</p>
             <div class="space-y-3">
               @for (audit of audits(); track audit.id) {
                 <button 
                   type="button"
                   (click)="selectAudit(audit.id!)"
                   class="w-full text-left p-3 rounded-lg cursor-pointer transition-all border border-transparent outline-none block"
                   [ngClass]="{
                     'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20': auditId() === audit.id,
                     'bg-white/5 border-white/10 hover:bg-white/10': auditId() !== audit.id && audit.status !== 'FAILED' && audit.status !== 'CANCELLED',
                     'bg-red-500/5 border-red-500/20 opacity-80': audit.status === 'FAILED' || audit.status === 'CANCELLED'
                   }">
                   
                   <p class="text-sm font-medium" [ngClass]="auditId() === audit.id ? 'text-emerald-100' : 'text-white'">
                     {{ getRepoName(audit.githubUrl) }}
                   </p>
                   
                   <div class="flex items-center justify-between mt-1">
                     <p class="text-[10px] text-white/40 uppercase tracking-tight truncate max-w-[150px]">
                       {{ audit.status === 'AWAITING_APPROVAL' ? 'Awaiting Approval' : (audit.status === 'SCANNING' || audit.status === 'PENDING') ? (audit.progressMessage || 'Initializing...') : audit.status === 'PATCHING' ? 'Applying Patch...' : audit.status }}
                     </p>
                     @if(audit.error) {
                        <mat-icon class="text-red-500 !w-3 !h-3 text-[12px] opacity-70">error</mat-icon>
                     }
                   </div>
                   
                   @if (audit.status === 'SCANNING' || audit.status === 'PENDING') {
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
                 </button>
               }

               @if(audits().length === 0 && auditService.user()) {
                 <div class="p-4 text-center border border-white/5 border-dashed rounded-lg">
                    <p class="text-xs text-white/40 mb-2">No active audits.</p>
                 </div>
               }
             </div>
          </div>
          
          <div class="px-6 pb-6 mt-auto">
             <!-- New Audit Input form -->
             <div class="space-y-2">
                <input 
                  type="text" 
                  #sidebarInput
                  (input)="newRepoUrl = sidebarInput.value" 
                  [value]="newRepoUrl"
                  (keyup.enter)="createNewAudit()"
                  placeholder="Enter GitHub URL to Scan..." 
                  class="w-full bg-[#121212] border border-white/10 rounded px-3 py-2 text-xs font-mono text-white/80 focus:outline-none focus:border-emerald-500/50" />
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
          
          <div class="p-4 bg-gradient-to-t from-white/5 to-transparent border-t border-white/10">
            <p class="text-xs text-white/60 mb-2 italic tracking-wide">"Gemini 2.5 Flash-Lite processing 1.4M tokens per second in background..."</p>
          </div>
        </aside>

        <!-- Main Workspace -->
        <section class="flex-1 flex flex-col p-4 md:p-8 bg-[#050505] overflow-y-auto w-full">
          @if (currentAudit()) {
             <!-- DETAIL WORKSPACE: Audit Selected -->
             <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6 shrink-0 border-b border-white/5 pb-4">
               <div class="flex-1 pr-6 min-w-0">
                 <button (click)="deselectAudit()" class="group mb-3 text-[10px] text-white/40 uppercase tracking-widest hover:text-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer font-bold outline-none">
                   <mat-icon class="!w-3 !h-3 text-[12px] flex items-center justify-center transition-transform group-hover:-translate-x-0.5">arrow_back</mat-icon>
                   Back to Dashboard
                 </button>
                 <h2 class="text-xl md:text-3xl font-light text-white truncate flex items-center flex-wrap gap-2 md:gap-3">
                    <span>Audit</span>
                    <span class="text-emerald-500 font-mono tracking-tighter text-lg md:text-2xl">#{{ currentAudit()?.id?.substring(0, 6) }}</span>
                    @if(currentAudit()?.status === 'COMPLETED') {
                        <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] tracking-widest uppercase border border-emerald-500/30 rounded inline-block transform md:-translate-y-1">Clean</span>
                    }
                 </h2>
                 <p class="text-white/40 font-mono text-xs md:text-sm mt-1 truncate select-all">{{ currentAudit()?.githubUrl }}</p>
               </div>
               
               <div class="flex flex-row md:flex-col items-center md:items-end flex-wrap gap-2 md:gap-2 shrink-0">
                 @if(currentAudit()?.reportUrl) {
                    <a [href]="currentAudit()?.reportUrl!" target="_blank" class="px-3 py-1.5 md:px-4 md:py-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 rounded text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-emerald-500/20 flex items-center gap-1.5 transition-colors cursor-pointer">
                      <mat-icon class="!w-4 !h-4 text-[14px] md:text-[16px] flex items-center justify-center">download</mat-icon>
                      <span class="hidden xs:inline">Download Report</span>
                      <span class="inline xs:hidden">Report</span>
                    </a>
                 }
                 
                 <!-- Status Pills -->
                 <span class="text-[10px] md:text-xs font-mono px-3 py-1 md:py-1.5 bg-white/5 border border-white/10 rounded text-white/60">
                   Status: {{ (currentAudit()?.status === 'SCANNING' || currentAudit()?.status === 'PENDING') && currentAudit()?.progressMessage ? currentAudit()?.progressMessage : currentAudit()?.status }}
                 </span>

                 @if (currentAudit()?.status === 'SCANNING' || currentAudit()?.status === 'PENDING') {
                   <button (click)="cancelCurrentAudit()" class="px-3 py-1 md:py-1.5 border border-amber-500/30 bg-amber-500/10 text-amber-500 rounded text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-amber-500/20 flex items-center gap-1.5 transition-colors cursor-pointer">
                     <mat-icon class="!w-4 !h-4 text-[14px] md:text-[16px] flex items-center justify-center">cancel</mat-icon>
                     Cancel
                   </button>
                 }

                 <button (click)="deleteCurrentAudit()" class="px-3 py-1 md:py-1.5 border border-red-500/30 bg-red-500/10 text-red-500 rounded text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 flex items-center gap-1.5 transition-colors cursor-pointer">
                   <mat-icon class="!w-4 !h-4 text-[14px] md:text-[16px] flex items-center justify-center">delete</mat-icon>
                   Remove
                 </button>
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

               <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                 <!-- Code Comparison / Diff -->
                 <div class="col-span-1 lg:col-span-8 flex flex-col bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden shadow-2xl h-full">
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
                 <div class="col-span-1 lg:col-span-4 flex flex-col gap-6 h-full">
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
             } @else {
                <!-- If scan is completed but clean -->
                @if (currentAudit()?.status === 'COMPLETED') {
                   <div class="flex flex-col items-center justify-center py-20 text-center bg-[#0a0a0a] border border-white/10 rounded-xl p-8 shadow-xl max-w-2xl mx-auto my-8">
                      <mat-icon class="text-emerald-500 text-[64px] !w-16 !h-16 mb-4">gavel</mat-icon>
                      <h3 class="text-xl font-light text-white mb-2">No Compliance Violations Detected</h3>
                      <p class="text-white/60 text-sm max-w-md">This repository scan completed successfully and conforms to SOC2, HIPAA, and GDPR compliance standards. No further action is required.</p>
                   </div>
                } @else if (currentAudit()?.status === 'FAILED') {
                   <div class="flex flex-col items-center justify-center py-20 text-center bg-red-500/5 border border-red-500/20 rounded-xl p-8 max-w-2xl mx-auto my-8">
                      <mat-icon class="text-red-500 text-[64px] !w-16 !h-16 mb-4">error_outline</mat-icon>
                      <h3 class="text-xl font-light text-white mb-2">Analysis Pipeline Failed</h3>
                      <p class="text-red-300 text-sm max-w-md mb-6 font-mono bg-[#121212] p-4 rounded border border-white/5">{{ currentAudit()?.error || 'Underlying analysis pipeline encountered an error.' }}</p>
                      <button (click)="deselectAudit()" class="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded uppercase text-[10px] font-bold tracking-widest transition-colors cursor-pointer outline-none">Go Back</button>
                   </div>
                } @else {
                   <div class="flex flex-col items-center justify-center py-20 text-center bg-[#0a0a0a] border border-white/10 rounded-xl p-8 max-w-2xl mx-auto my-8">
                      <mat-icon class="text-emerald-400 animate-spin text-[48px] !w-12 !h-12 mb-4 animate-[spin_4s_linear_infinite]">sync</mat-icon>
                      <h3 class="text-xl font-light text-white mb-2">Analysis in Progress...</h3>
                      <p class="text-white/40 text-sm max-w-md">The compliance engine is currently pulling findings and running static analysis on your repository. Results will stream in live.</p>
                   </div>
                }
             }

          } @else {
             <!-- OVERVIEW WORKSPACE: No Audit Selected -->
             <div class="space-y-8 animate-fade-in">
                <!-- Dashboard Welcome / Header -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
                  <div>
                    <h2 class="text-3xl font-light text-white tracking-tight">Security & Compliance Dashboard</h2>
                    <p class="text-white/40 text-sm mt-1">Real-time repository auditing, LangGraph-driven patch generation, and vulnerability scanning.</p>
                  </div>
                  <!-- Quick Actions / Trigger New Scan directly on dashboard -->
                  <div class="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 shadow-xl max-w-md">
                    <mat-icon class="text-emerald-500 shrink-0">add_moderator</mat-icon>
                    <div class="flex gap-2">
                      <input 
                        type="text" 
                        #dashboardRepoInput
                        (input)="newRepoUrl = dashboardRepoInput.value"
                        [value]="newRepoUrl"
                        (keyup.enter)="createNewAudit()"
                        placeholder="https://github.com/org/repo" 
                        class="bg-[#121212] border border-white/10 rounded px-3 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 w-48 sm:w-64" />
                      <button 
                        (click)="createNewAudit()" 
                        [disabled]="!newRepoUrl || !auditService.user()" 
                        class="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-semibold text-xs px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0">
                        Scan
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Stats Row -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <!-- Stat 1: Total Scans -->
                  <div class="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all flex flex-col justify-between">
                    <span class="text-xs font-mono text-white/40 uppercase tracking-widest">Total Scans</span>
                    <span class="text-4xl font-light text-white mt-2">{{ audits().length }}</span>
                  </div>
                  <!-- Stat 2: Action Items -->
                  <div class="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all flex flex-col justify-between">
                    <span class="text-xs font-mono text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                      Action Required
                      @if (actionItems().length > 0) {
                        <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                      }
                    </span>
                    <span class="text-4xl font-light mt-2" [ngClass]="actionItems().length > 0 ? 'text-amber-500' : 'text-white/40'">
                      {{ actionItems().length }}
                    </span>
                  </div>
                  <!-- Stat 3: Running / Pending -->
                  <div class="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all flex flex-col justify-between">
                    <span class="text-xs font-mono text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                      Active Scans
                      @if (pendingScans().length > 0) {
                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      }
                    </span>
                    <span class="text-4xl font-light mt-2" [ngClass]="pendingScans().length > 0 ? 'text-emerald-400' : 'text-white/40'">
                      {{ pendingScans().length }}
                    </span>
                  </div>
                  <!-- Stat 4: Completed -->
                  <div class="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all flex flex-col justify-between">
                    <span class="text-xs font-mono text-white/40 uppercase tracking-widest">Completed</span>
                    <span class="text-4xl font-light text-emerald-500 mt-2">
                      {{ getCompletedCount() }}
                    </span>
                  </div>
                </div>

                <!-- 3-Column Responsive Grid for main sections -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  
                  <!-- COLUMN 1: ACTION ITEMS (Awaiting Approval) -->
                  <div class="bg-[#080808] border border-white/5 rounded-xl p-6 flex flex-col h-full min-h-[400px]">
                    <div class="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                      <div class="flex items-center gap-2">
                        <mat-icon class="text-amber-500 text-[20px] !w-5 !h-5 flex items-center justify-center">pending_actions</mat-icon>
                        <h3 class="text-sm font-semibold tracking-wider text-white uppercase">Action Items</h3>
                      </div>
                      <span class="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-mono rounded">
                        {{ actionItems().length }} Awaiting HITL
                      </span>
                    </div>

                    <div class="space-y-4 flex-1">
                      @for (audit of actionItems(); track audit.id) {
                        <div class="bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 transition-all">
                          <div class="flex justify-between items-start gap-2">
                            <span class="text-xs font-mono text-emerald-400 font-semibold truncate">{{ getRepoName(audit.githubUrl) }}</span>
                            <span class="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-mono rounded border border-amber-500/20">Awaiting Approval</span>
                          </div>
                          <p class="text-[10px] text-white/40 truncate font-mono mt-1">{{ audit.githubUrl }}</p>
                          
                          <div class="mt-3 flex items-center justify-between">
                            <span class="text-[10px] text-amber-500 font-medium">Proposed patch generated</span>
                            <button (click)="selectAudit(audit.id!)" class="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1">
                              Review Fix
                              <mat-icon class="text-[12px] !w-3 !h-3 flex items-center justify-center">arrow_forward</mat-icon>
                            </button>
                          </div>
                        </div>
                      }

                      @if (actionItems().length === 0) {
                        <div class="flex flex-col items-center justify-center text-center py-16 opacity-60 h-full">
                          <mat-icon class="text-emerald-500 text-[48px] !w-12 !h-12 mb-3">check_circle</mat-icon>
                          <h4 class="text-sm font-medium text-white mb-1">All Clear!</h4>
                          <p class="text-xs text-white/40 max-w-[200px]">No pending compliance approvals. Everything is safe.</p>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- COLUMN 2: PENDING SCANS -->
                  <div class="bg-[#080808] border border-white/5 rounded-xl p-6 flex flex-col h-full min-h-[400px]">
                    <div class="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                      <div class="flex items-center gap-2">
                        <mat-icon class="text-emerald-400 text-[20px] !w-5 !h-5 flex items-center justify-center animate-spin" [style.animationDuration]="'6s'">sync</mat-icon>
                        <h3 class="text-sm font-semibold tracking-wider text-white uppercase">Pending Scans</h3>
                      </div>
                      <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono rounded">
                        {{ pendingScans().length }} Running
                      </span>
                    </div>

                    <div class="space-y-4 flex-1">
                      @for (audit of pendingScans(); track audit.id) {
                        <div class="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-all">
                          <div class="flex justify-between items-start gap-2">
                            <span class="text-xs font-medium text-white truncate">{{ getRepoName(audit.githubUrl) }}</span>
                            <button (click)="cancelScanDirect(audit)" class="text-white/40 hover:text-red-400 transition-colors p-0.5 rounded cursor-pointer" title="Cancel Scan">
                              <mat-icon class="text-[16px] !w-4 !h-4 flex items-center justify-center">cancel</mat-icon>
                            </button>
                          </div>
                          <p class="text-[10px] text-white/40 truncate font-mono mt-1">{{ audit.githubUrl }}</p>
                          
                          <!-- Progress Info -->
                          <div class="mt-4">
                            <div class="flex justify-between items-center text-[10px] text-emerald-400 font-mono mb-1">
                              <span class="truncate pr-2">{{ audit.progressMessage || 'Initializing...' }}</span>
                              <span>Scanning</span>
                            </div>
                            <!-- Bar -->
                            <div class="w-full bg-white/10 h-1.5 rounded-full overflow-hidden relative">
                              <div class="bg-emerald-500 w-1/3 h-1.5 rounded-full absolute animate-[shimmer_1.5s_infinite]"></div>
                            </div>
                          </div>
                        </div>
                      }

                      @if (pendingScans().length === 0) {
                        <div class="flex flex-col items-center justify-center text-center py-16 opacity-60 h-full">
                          <mat-icon class="text-white/20 text-[48px] !w-12 !h-12 mb-3">explore_off</mat-icon>
                          <h4 class="text-sm font-medium text-white mb-1">No Active Scans</h4>
                          <p class="text-xs text-white/40 max-w-[200px]">Start a new scan from the top or sidebar to begin scanning.</p>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- COLUMN 3: RECENT AUDITS -->
                  <div class="bg-[#080808] border border-white/5 rounded-xl p-6 flex flex-col h-full min-h-[400px]">
                    <div class="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                      <div class="flex items-center gap-2">
                        <mat-icon class="text-indigo-400 text-[20px] !w-5 !h-5 flex items-center justify-center">history</mat-icon>
                        <h3 class="text-sm font-semibold tracking-wider text-white uppercase">Recent Audits</h3>
                      </div>
                      <span class="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono rounded">
                        {{ recentAudits().length }} Total
                      </span>
                    </div>

                    <div class="space-y-4 flex-1 max-h-[500px] overflow-y-auto pr-1">
                      @for (audit of recentAudits(); track audit.id) {
                        <div class="bg-white/5 border border-white/10 rounded-xl p-4 transition-all hover:bg-white/10">
                          <div class="flex justify-between items-start gap-2">
                            <span class="text-xs font-medium text-white truncate select-all">{{ getRepoName(audit.githubUrl) }}</span>
                            
                            @if (audit.status === 'COMPLETED') {
                              <span class="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono rounded">COMPLETED</span>
                            } @else if (audit.status === 'FAILED') {
                              <span class="px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-mono rounded">FAILED</span>
                            } @else if (audit.status === 'CANCELLED') {
                              <span class="px-1.5 py-0.5 bg-white/10 text-white/40 border border-white/20 text-[9px] font-mono rounded">CANCELLED</span>
                            }
                          </div>
                          
                          <p class="text-[9px] text-white/40 truncate font-mono mt-1">{{ audit.githubUrl }}</p>

                          @if (audit.status === 'COMPLETED') {
                            <div class="mt-2.5 pt-2.5 border-t border-white/5 flex items-center justify-between">
                              <span class="text-[10px] text-white/50">
                                {{ getVulnLength(audit) }} issues identified
                              </span>
                              <div class="flex gap-2">
                                @if (audit.reportUrl) {
                                  <a [href]="audit.reportUrl" target="_blank" class="p-1 hover:text-emerald-400 text-white/40 transition-colors" title="Download PDF Report">
                                    <mat-icon class="text-[14px] !w-3.5 !h-3.5 flex items-center justify-center">download</mat-icon>
                                  </a>
                                }
                                <button (click)="selectAudit(audit.id!)" class="p-1 hover:text-white text-white/40 transition-colors cursor-pointer" title="View Detailed Findings">
                                  <mat-icon class="text-[14px] !w-3.5 !h-3.5 flex items-center justify-center">visibility</mat-icon>
                                </button>
                              </div>
                            </div>
                          } @else if (audit.status === 'FAILED') {
                            <p class="text-[10px] text-red-400 font-mono mt-2 truncate bg-red-500/5 p-1.5 rounded border border-red-500/10">{{ audit.error || 'Unknown scanner error' }}</p>
                          } @else if (audit.status === 'CANCELLED') {
                            <p class="text-[10px] text-white/30 font-mono mt-2">Scan cancelled by user</p>
                          }
                        </div>
                      }

                      @if (recentAudits().length === 0) {
                        <div class="flex flex-col items-center justify-center text-center py-16 opacity-60 h-full">
                          <mat-icon class="text-white/10 text-[48px] !w-12 !h-12 mb-3">history_toggle_off</mat-icon>
                          <h4 class="text-sm font-medium text-white mb-1">No Audit History</h4>
                          <p class="text-xs text-white/40 max-w-[200px]">Audit results will appear here once scans are completed.</p>
                        </div>
                      }
                    </div>
                  </div>

                </div>
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

      <!-- Cancel Confirmation Dialog -->
      @if (showCancelConfirmation()) {
        <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
           <div class="bg-[#121212] border border-white/10 rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col items-center text-center">
              <mat-icon class="text-amber-500 !w-12 !h-12 text-[48px] mb-4">warning</mat-icon>
              <h2 class="text-xl font-light text-white mb-2">Cancel Active Scan?</h2>
              <p class="text-white/60 text-sm mb-8 leading-relaxed">Are you sure you want to cancel the current scan for <span class="text-emerald-400 font-mono">{{ cancelTarget()?.githubUrl || currentAudit()?.githubUrl }}</span>? This will stop the operation immediately.</p>
              
              <div class="flex gap-4 w-full">
                 <button (click)="cancelTarget.set(null); showCancelConfirmation.set(false)" class="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded tracking-widest uppercase text-[10px] font-bold transition-colors cursor-pointer">Keep Scanning</button>
                 <button (click)="confirmCancelScan()" class="flex-1 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded tracking-widest uppercase text-[10px] font-bold transition-colors cursor-pointer">Yes, Cancel</button>
              </div>
           </div>
        </div>
      }
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
  version = packageJson.version;
  
  isMobileSidebarOpen = signal(false);
  
  audits = this.auditService.activeAudits;
  currentAudit = this.auditService.currentAudit;
  vulns = this.auditService.currentVulns;
  
  auditId = signal<string | null>(null);
  showCancelConfirmation = signal(false);
  cancelTarget = signal<Audit | null>(null);
  
  newRepoUrl = '';
  
  // Clean up unsubscribes in real app
  currentAuditSub: (() => void) | null = null;

  pendingScans = computed(() => this.audits().filter(a => a.status === 'PENDING' || a.status === 'SCANNING' || a.status === 'PATCHING'));
  recentAudits = computed(() => this.audits().filter(a => a.status === 'COMPLETED' || a.status === 'FAILED' || a.status === 'CANCELLED'));
  actionItems = computed(() => this.audits().filter(a => a.status === 'AWAITING_APPROVAL'));

  getRepoName(url: string) {
     try {
       const u = new URL(url);
       const parts = u.pathname.split('/').filter(Boolean);
       if (parts.length >= 2) return parts[1];
       return url;
     } catch {
       return url;
     }
  }

  getCompletedCount(): number {
    return this.recentAudits().filter(a => a.status === 'COMPLETED').length;
  }

  getVulnLength(audit: Audit): number {
    return audit?.vulnerabilities?.length || 0;
  }

  selectAudit(id: string) {
     this.auditId.set(id);
     if (this.currentAuditSub) {
        this.currentAuditSub(); // unsubscribe
     }
     this.currentAuditSub = this.auditService.subscribeToAuditDetails(id);
  }

  deselectAudit() {
     this.auditId.set(null);
     this.currentAudit.set(null);
     if (this.currentAuditSub) {
        this.currentAuditSub();
        this.currentAuditSub = null;
     }
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
     this.deselectAudit();
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

  async cancelCurrentAudit() {
     this.cancelTarget.set(null);
     this.showCancelConfirmation.set(true);
  }

  cancelScanDirect(audit: Audit) {
     this.cancelTarget.set(audit);
     this.showCancelConfirmation.set(true);
  }

  async confirmCancelScan() {
     const audit = this.cancelTarget() || this.currentAudit();
     if (audit && audit.id) {
        await this.auditService.cancelAudit(audit.id);
     }
     this.showCancelConfirmation.set(false);
     this.cancelTarget.set(null);
  }

  async deleteCurrentAudit() {
     const audit = this.currentAudit();
     if (audit && audit.id) {
        await this.auditService.deleteAudit(audit.id);
        this.deselectAudit();
     }
  }
}

