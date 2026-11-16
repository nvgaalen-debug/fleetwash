// Bewaakt dat 'Automatisch plannen' bij veel medewerkers niet weer kwadratisch traag wordt (insertLoop herberekende
// vroeger bij elke stap alles opnieuw bij alle medewerkers: O(bezoeken² × medewerkers)). Genereuze marge voor
// tragere CI-machines; dit moet alleen een grove regressie (orde van grootte) opvangen, geen exacte timing.
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { engine } from "./lib.mjs";

function timePlan(nWorkers, jobsPerWorker) {
  const e = engine();
  e.ctx.nW = nWorkers; e.ctx.jpw = jobsPerWorker;
  const out = vm.runInContext(`
    (function(){
      const rng2=rng(nW*1000+jpw);
      D=sample('wassen');
      D.customers=[];D.locations=[];D.jobs=[];D.plans={};D.absences=[];
      D.workers=[];
      for(let i=0;i<nW;i++)D.workers.push({id:'w'+i,name:'W'+i,postcode:'',city:'',lat:52.0+rng2()*0.3,lng:5.0+rng2()*0.4,geo:'manual',
        start:'08:00',end:'16:30',days:[1,2,3,4,5],absent:[],skills:[],color:i%6,token:'t'+i});
      D.types=[{id:'std',name:'Standaard',dur:25,skill:''}];
      const date='2026-11-17';let jid=0;const nJobs=nW*jpw;
      for(let i=0;i<nJobs;i++){const lid='l'+i,cid='c'+i;const lat=52.0+rng2()*0.3,lng=5.0+rng2()*0.4;
        D.customers.push({id:cid,name:'Klant'+i});
        D.locations.push({id:lid,customerId:cid,name:'Loc'+i,address:'',postcode:'',city:'',lat,lng,geo:'manual'});
        const h=8+Math.floor(rng2()*7);
        D.jobs.push({id:'j'+(jid++),plate:'J'+i,vehicle:'',locationId:lid,date,from:String(h).padStart(2,'0')+':00',to:String(Math.min(16,h+3)).padStart(2,'0')+':30',type:'std',duration:'',priority:2,notes:''});
      }
      LEGS.clear();index();
      const t0=Date.now();autoPlan(date);const t1=Date.now();
      const P=D.plans[date]||{routes:{}};const planned=Object.values(P.routes).reduce((n,r)=>n+r.length,0);
      return JSON.stringify({ms:t1-t0,planned,total:D.jobs.length});
    })()
  `, e.ctx);
  return JSON.parse(out);
}

test("30 medewerkers, 180 opdrachten (6/dag): plant alles ruim binnen 20 sec", () => {
  const r = timePlan(30, 6);
  assert.equal(r.planned, r.total, "alles ingepland");
  assert.ok(r.ms < 20000, `autoPlan duurde ${r.ms}ms (verwacht < 20000ms)`);
});

test("groei met het aantal medewerkers blijft beheersbaar (geen kwadratische blow-up met medewerkers)", () => {
  const a = timePlan(10, 6), b = timePlan(20, 6);
  assert.equal(a.planned, a.total); assert.equal(b.planned, b.total);
  // Bij de oude, niet-incrementele insertLoop groeide dit met > W (medewerkers) erbij; na de fix ruim onder 6x bij 2x zoveel medewerkers.
  assert.ok(b.ms < a.ms * 6, `tijd bij 20 medewerkers (${b.ms}ms) groeide te veel t.o.v. 10 medewerkers (${a.ms}ms)`);
});
