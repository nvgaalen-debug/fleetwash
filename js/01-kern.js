"use strict";
/* ---------- hulpfuncties ---------- */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>p+Math.random().toString(36).slice(2,9);
const t2m=s=>{if(!s)return null;const m=/^(\d{1,2}):(\d{2})/.exec(s);return m?(+m[1])*60+(+m[2]):null};
const m2t=m=>{m=Math.round(m);const h=Math.floor(m/60),mm=((m%60)+60)%60;return String(h).padStart(2,'0')+':'+String(mm).padStart(2,'0')};
const fdur=m=>{m=Math.round(m);if(m<60)return m+' min';const h=Math.floor(m/60),mm=m%60;return h+'u'+(mm?' '+String(mm).padStart(2,'0')+'m':'')};
const fkm=k=>(Math.round(k*10)/10).toLocaleString('nl-NL',{maximumFractionDigits:k<10?1:0})+' km';
const addDays=(d,n)=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
const wday=d=>new Date(d+'T12:00:00').getDay();
const fdate=(d,o={weekday:'long',day:'numeric',month:'long'})=>new Date(d+'T12:00:00').toLocaleDateString('nl-NL',o);
const DAYS=[[1,'ma'],[2,'di'],[3,'wo'],[4,'do'],[5,'vr'],[6,'za'],[0,'zo']];
const COLORS=['Blauw','Oranje','Paars','Groen','Roze','Oker'];
const ic=p=>`<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${p}</g></svg>`;
const I={
  up:ic('<path d="M8 13V3M4 7l4-4 4 4"/>'),down:ic('<path d="M8 3v10M4 9l4 4 4-4"/>'),
  pin:ic('<path d="M6 2h4l-.4 4L12 8.5H4L6.4 6zM8 8.5V14"/>'),plus:ic('<path d="M8 3v10M3 8h10"/>'),
  edit:ic('<path d="M3 13l1-3.5 7-7L13.5 5l-7 7z"/>'),trash:ic('<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/>'),
  auto:ic('<path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3M3.4 3.4l2 2M10.6 10.6l2 2M12.6 3.4l-2 2M5.4 10.6l-2 2"/>'),
  route:ic('<circle cx="4" cy="12" r="2"/><circle cx="12" cy="4" r="2"/><path d="M6 12h3.5a2.5 2.5 0 0 0 0-5h-3a2.5 2.5 0 0 1 0-5H10"/>'),
  unlock:ic('<rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 4.8-1"/>'),
  imp:ic('<path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13.5h10"/>'),chat:ic('<path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z"/>'),send:ic('<path d="M14 2 2 7.2l5 1.8 1.8 5z"/>'),check:ic('<path d="m3 8.5 3.2 3L13 4.5"/>'),copy:ic('<rect x="5" y="5" width="8.5" height="8.5" rx="1.5"/><path d="M3 10.5V3.5A1 1 0 0 1 4 2.5h6.5"/>')
};
const plateHtml=p=>`<span class="plate"><i>NL</i><span>${esc(p||'—')}</span></span>`;
const wc=w=>`var(--w${(w&&w.color!=null?w.color:0)%6})`;

/* ---------- postcode -> coördinaten (schatting) ---------- */
const PC4={'1011':[52.373,4.900],'1101':[52.312,4.945],'1441':[52.503,4.955],'1506':[52.438,4.826],'2011':[52.382,4.630],'1012':[52.374,4.893],'1017':[52.363,4.890],'1043':[52.385,4.840],'1062':[52.355,4.830],'1071':[52.355,4.880],'1081':[52.335,4.870],'1181':[52.303,4.860],'2131':[52.300,4.690],'3011':[51.920,4.485],'2511':[52.078,4.313],'3511':[52.092,5.118],'3521':[52.078,5.108],'3523':[52.070,5.110],'3542':[52.103,5.068],'3431':[52.029,5.081],'3439':[52.035,5.095],'3991':[52.030,5.160],'3811':[52.156,5.387],'3824':[52.170,5.410],'3901':[52.026,5.555],'4001':[51.886,5.429],'4004':[51.893,5.405],'4101':[51.955,5.227],'4105':[51.950,5.240],'4191':[51.881,5.289],'4201':[51.836,4.974],'4207':[51.840,4.990],'4811':[51.589,4.776],'5038':[51.556,5.090],'5141':[51.682,5.070],'5211':[51.697,5.304],'5222':[51.710,5.315],'5301':[51.810,5.248],'5341':[51.765,5.518],'5342':[51.770,5.530],'5461':[51.616,5.549],'5466':[51.615,5.540],'5611':[51.441,5.478],'5615':[51.450,5.470],'5617':[51.448,5.455],'5701':[51.476,5.661],'5705':[51.470,5.650],'6511':[51.842,5.853],'6811':[51.985,5.899],'8011':[52.512,6.094],'9711':[53.219,6.567],'6211':[50.851,5.690]};
const PC2={10:[52.37,4.90],11:[52.31,4.90],12:[52.22,5.17],13:[52.37,5.21],14:[52.47,4.93],15:[52.44,4.82],16:[52.66,5.08],17:[52.70,4.80],18:[52.63,4.75],19:[52.49,4.66],20:[52.38,4.64],21:[52.30,4.66],22:[52.22,4.45],23:[52.16,4.49],24:[52.13,4.66],25:[52.07,4.30],26:[52.02,4.38],27:[52.05,4.50],28:[52.01,4.71],29:[51.93,4.60],30:[51.92,4.48],31:[51.91,4.37],32:[51.85,4.33],33:[51.81,4.67],34:[52.07,4.88],35:[52.09,5.12],36:[52.15,5.03],37:[52.10,5.25],38:[52.16,5.39],39:[52.02,5.48],40:[51.89,5.43],41:[51.95,5.23],42:[51.84,4.97],43:[51.50,3.61],44:[51.50,3.89],45:[51.30,3.80],46:[51.49,4.29],47:[51.53,4.46],48:[51.59,4.78],49:[51.64,4.86],50:[51.56,5.09],51:[51.66,5.00],52:[51.69,5.30],53:[51.79,5.35],54:[51.66,5.62],55:[51.40,5.40],56:[51.44,5.48],57:[51.48,5.66],58:[51.53,5.98],59:[51.37,6.17],60:[51.25,5.71],61:[51.00,5.87],62:[50.85,5.69],63:[50.88,5.90],64:[50.88,6.00],65:[51.84,5.86],66:[51.82,5.70],67:[52.03,5.66],68:[51.98,5.91],69:[51.93,6.07],70:[51.96,6.30],71:[51.97,6.72],72:[52.14,6.20],73:[52.21,5.97],74:[52.25,6.16],75:[52.22,6.89],76:[52.36,6.66],77:[52.57,6.62],78:[52.79,6.90],79:[52.72,6.48],80:[52.51,6.09],81:[52.40,6.27],82:[52.52,5.47],83:[52.71,5.75],84:[52.96,5.92],85:[52.97,5.79],86:[53.03,5.66],87:[53.06,5.53],88:[53.18,5.42],89:[53.20,5.79],90:[53.25,5.95],91:[53.32,6.00],92:[53.11,6.10],93:[52.99,6.56],94:[52.95,6.60],95:[52.99,6.95],96:[53.17,6.80],97:[53.22,6.57],98:[53.30,6.50],99:[53.32,6.86]};
const CITY={"AMSTERDAM":[52.370,4.895],"ROTTERDAM":[51.922,4.479],"DEN HAAG":[52.078,4.288],"UTRECHT":[52.091,5.122],"EINDHOVEN":[51.441,5.478],"TILBURG":[51.556,5.091],"GRONINGEN":[53.219,6.567],"ALMERE":[52.371,5.222],"BREDA":[51.589,4.776],"NIJMEGEN":[51.842,5.853],"APELDOORN":[52.211,5.969],"ARNHEM":[51.985,5.899],"HAARLEM":[52.381,4.636],"ENSCHEDE":[52.221,6.893],"AMERSFOORT":[52.156,5.387],"ZAANDAM":[52.439,4.826],"ZAANSTAD":[52.439,4.826],"'S-HERTOGENBOSCH":[51.697,5.304],"ZWOLLE":[52.512,6.094],"LEIDEN":[52.160,4.497],"ZOETERMEER":[52.060,4.494],"LEEUWARDEN":[53.201,5.799],"MAASTRICHT":[50.851,5.690],"DORDRECHT":[51.813,4.690],"EDE":[52.040,5.665],"ALPHEN AAN DEN RIJN":[52.129,4.656],"ALKMAAR":[52.632,4.748],"EMMEN":[52.785,6.897],"DELFT":[52.012,4.357],"VENLO":[51.370,6.172],"BLERICK":[51.367,6.146],"DEVENTER":[52.255,6.163],"SITTARD":[50.998,5.869],"GELEEN":[50.974,5.828],"HELMOND":[51.479,5.657],"OSS":[51.765,5.518],"AMSTELVEEN":[52.303,4.857],"HILVERSUM":[52.223,5.176],"HOOFDDORP":[52.303,4.689],"HEERLEN":[50.888,5.980],"KERKRADE":[50.866,6.063],"NIEUWEGEIN":[52.029,5.081],"HOUTEN":[52.028,5.168],"ZEIST":[52.089,5.233],"WOERDEN":[52.086,4.883],"VEENENDAAL":[52.026,5.556],"BARNEVELD":[52.140,5.585],"WAGENINGEN":[51.969,5.665],"HARDERWIJK":[52.342,5.632],"NUNSPEET":[52.379,5.786],"LELYSTAD":[52.518,5.471],"DRONTEN":[52.525,5.718],"ZEEWOLDE":[52.330,5.541],"EMMELOORD":[52.711,5.749],"KAMPEN":[52.555,5.911],"MEPPEL":[52.696,6.194],"HOOGEVEEN":[52.723,6.477],"ASSEN":[52.993,6.564],"COEVORDEN":[52.661,6.741],"SLEEN":[52.772,6.802],"HARDENBERG":[52.576,6.619],"ALMELO":[52.357,6.662],"HENGELO":[52.266,6.793],"OLDENZAAL":[52.313,6.929],"RIJSSEN":[52.307,6.519],"ZUTPHEN":[52.139,6.196],"DOETINCHEM":[51.965,6.289],"WINTERSWIJK":[51.973,6.720],"TIEL":[51.886,5.430],"CULEMBORG":[51.955,5.227],"GELDERMALSEN":[51.881,5.289],"ZALTBOMMEL":[51.810,5.249],"GORINCHEM":[51.836,4.974],"LEERDAM":[51.893,5.091],"PAPENDRECHT":[51.832,4.688],"SLIEDRECHT":[51.822,4.773],"ZWIJNDRECHT":[51.817,4.640],"RIDDERKERK":[51.873,4.603],"BARENDRECHT":[51.855,4.535],"CAPELLE AAN DEN IJSSEL":[51.929,4.578],"SCHIEDAM":[51.917,4.399],"VLAARDINGEN":[51.912,4.341],"MAASSLUIS":[51.923,4.250],"SPIJKENISSE":[51.845,4.329],"GOUDA":[52.012,4.711],"RIJSWIJK":[52.036,4.325],"VOORBURG":[52.074,4.360],"LEIDSCHENDAM":[52.087,4.393],"WASSENAAR":[52.143,4.400],"KATWIJK":[52.203,4.400],"NOORDWIJK":[52.236,4.443],"NAALDWIJK":[51.994,4.208],"HOORN":[52.643,5.060],"PURMEREND":[52.505,4.959],"HEERHUGOWAARD":[52.669,4.832],"DEN HELDER":[52.956,4.760],"BEVERWIJK":[52.484,4.657],"VELSERBROEK":[52.452,4.638],"IJMUIDEN":[52.459,4.613],"DIEMEN":[52.339,4.963],"SCHIPHOL":[52.310,4.760],"BUSSUM":[52.274,5.161],"HUIZEN":[52.299,5.243],"SOEST":[52.174,5.307],"BAARN":[52.211,5.287],"MAARSSEN":[52.135,5.040],"IJSSELSTEIN":[52.020,5.042],"VIANEN":[51.991,5.091],"WAALWIJK":[51.683,5.070],"OOSTERHOUT":[51.645,4.860],"DONGEN":[51.626,4.939],"ETTEN-LEUR":[51.570,4.636],"ROOSENDAAL":[51.531,4.465],"RUCPHEN":[51.531,4.558],"BERGEN OP ZOOM":[51.495,4.287],"GOES":[51.504,3.889],"MIDDELBURG":[51.499,3.611],"VLISSINGEN":[51.443,3.573],"TERNEUZEN":[51.336,3.828],"VUGHT":[51.653,5.290],"ROSMALEN":[51.716,5.365],"DRUNEN":[51.686,5.134],"BOXTEL":[51.590,5.329],"BEST":[51.507,5.390],"VELDHOVEN":[51.418,5.403],"VALKENSWAARD":[51.351,5.459],"VEGHEL":[51.616,5.549],"UDEN":[51.661,5.619],"DEURNE":[51.462,5.794],"WEERT":[51.252,5.706],"ROERMOND":[51.194,5.987],"HERTEN":[51.180,5.965],"VENRAY":[51.526,5.975],"BOXMEER":[51.646,5.947],"BEUGEN":[51.673,5.938],"CUIJK":[51.727,5.879],"WIJCHEN":[51.809,5.725],"HEERENVEEN":[52.960,5.920],"DRACHTEN":[53.106,6.099],"SNEEK":[53.033,5.659],"VEENDAM":[53.106,6.879],"HOOGEZAND":[53.161,6.762]};
const CITY_ALIAS={"DEN BOSCH":"'S-HERTOGENBOSCH","S-HERTOGENBOSCH":"'S-HERTOGENBOSCH","'S HERTOGENBOSCH":"'S-HERTOGENBOSCH","'S-GRAVENHAGE":"DEN HAAG","S-GRAVENHAGE":"DEN HAAG","THE HAGUE":"DEN HAAG"};
function cityGeo(city){const c=String(city||'').replace(/\u00a0/g,' ').trim().toUpperCase().replace(/\s+/g,' ');if(!c)return null;const k=CITY_ALIAS[c]||c;if(CITY[k])return CITY[k];for(const w of k.split(/[\s\/,]+/).reverse())if(CITY[w])return CITY[w];return null}
function geocode(pc,city){const p=String(pc||'').replace(/\s/g,'').toUpperCase();const p4=p.slice(0,4);if(PC4[p4])return{lat:PC4[p4][0],lng:PC4[p4][1],geo:'pc4'};const g=cityGeo(city);if(g)return{lat:g[0],lng:g[1],geo:'plaats'};const p2=+p.slice(0,2);if(p.length>=2&&PC2[p2])return{lat:PC2[p2][0],lng:PC2[p2][1],geo:'pc2'};return null}
const GEO_LABEL={manual:'Exact',pdok:'Exact adres (PDOK)',pc4:'Postcodegebied (4 cijfers)',plaats:'Plaats (schatting)',pc2:'Regio (schatting)'};

/* ---------- data ---------- */
const KEY='wasroute.v1';
let D=null;
const S={tab:'planning',date:'2026-10-29',wid:null,selLoc:null,mapMode:'routes',jobScope:'dag'};
let JOB={},LOC={},CUS={},WRK={},TYP={};
function index(){JOB={};LOC={};CUS={};WRK={};TYP={};D.jobs.forEach(x=>JOB[x.id]=x);D.locations.forEach(x=>LOC[x.id]=x);D.customers.forEach(x=>CUS[x.id]=x);D.workers.forEach(x=>WRK[x.id]=x);if(!D.absences)migrateAbsences();(D.absences||[]).forEach(a=>{if(a.type==='ziek')a.note=''});(D.sickLog||[]).forEach(x=>{if(!x.type||x.type==='ziek')x.note='Ziek'});syncAbsences();D.types.forEach(x=>TYP[x.id]=x)}
function rng(seed){return()=>(seed=(seed*1664525+1013904223)%4294967296)/4294967296}
function sample(){
  const r=rng(11),CON='BDFGHJKLNPRSTVXZ',L=()=>CON[Math.floor(r()*CON.length)],N=()=>Math.floor(r()*10);
  const plate=()=>r()<.55?`${L()}${L()}-${N()}${N()}${N()}-${L()}`:`${N()}-${L()}${L()}${L()}-${N()}${N()}`;
  const CARS=['VW Golf','Toyota Corolla','Kia Niro','Skoda Octavia','Peugeot 308','Volvo XC40','Tesla Model 3','Renault Clio','BMW 3-serie','Audi A4'];
  const VANS=['Renault Master','VW Crafter','Ford Transit','Mercedes Sprinter','Citroën Jumper'];
  const d={version:1,settings:{urbanKm:6,urbanSpeed:35,roadSpeed:80,roadFactor:1.3,parkMin:5,minTravel:6,pauseMin:30,pauseAt:'12:00',pauseMinDay:330,kmWeight:0.3,startAtFirst:true,endAtLast:false,maxPreTravel:60},
    types:[{id:'buiten',name:'Buitenwas',dur:20,skill:''},{id:'interieur',name:'Interieur',dur:30,skill:''},{id:'compleet',name:'Compleet in + uit',dur:45,skill:''},{id:'bedrijfswagen',name:'Bedrijfswagen / bus',dur:40,skill:'bedrijfswagens'},{id:'coating',name:'Lak & coating',dur:90,skill:'coating'}],
    customers:[],locations:[],jobs:[],workers:[],plans:{}};
  const A='2026-10-29',B='2026-10-30';
  const SPEC=[
   ['Autobedrijf Van Dijk','Peter van Dijk','0418 512 340','Showroom','Industrieweg 12','5301 LK','Zaltbommel',51.8175,5.2620,[[A,2,'compleet','08:00','12:00',2],[A,2,'buiten','08:00','12:00',2],[B,3,'buiten','08:00','11:00',2]]],
   ['Leasecentrum Brabant','Ingrid Smits','073 610 22 90','Uitleverlocatie','Ertveldweg 8','5222 AJ',"'s-Hertogenbosch",51.7100,5.3150,[[A,3,'buiten','09:00','16:00',2],[A,2,'interieur','09:00','16:00',2]]],
   ['Gemeente Tiel','Ruud Hendriks','0344 637 100','Gemeentewerf','Kellenseweg 5','4004 JH','Tiel',51.8930,5.4050,[[A,3,'bedrijfswagen','10:00','15:00',3]]],
   ['Bouwbedrijf Merwede','Anouk de Groot','0183 640 818','Bouwdepot','Avelingen-West 30','4207 HH','Gorinchem',51.8400,4.9900,[[A,3,'bedrijfswagen','07:30','11:00',2]]],
   ['Zorggroep Rivierenland','Hanneke Vos','0345 532 600','Locatie De Plantage','Plantage 2','4105 PB','Culemborg',51.9500,5.2400,[[A,4,'compleet','','',1]]],
   ['Autohuis Lage Weide','Kees Mulder','030 241 77 00','Werkplaats','Cartesiusweg 90','3542 AA','Utrecht',52.1030,5.0680,[[A,3,'compleet','08:00','13:00',3],[A,2,'buiten','08:00','13:00',3],[B,2,'compleet','09:00','14:00',2]]],
   ['Kantoorpark Laagraven','Facilitair bureau','030 600 45 45','Parkeerdek P2','Laagraven 3','3439 LG','Nieuwegein',52.0350,5.0950,[[A,3,'buiten','','',1]]],
   ['Studio Glans','Mila Koster','06 4123 8812','Showroom','Meidoornkade 14','3991 AE','Houten',52.0300,5.1600,[[A,2,'coating','09:00','17:00',2]]],
   ['Fleet Strijp','Bas Willems','040 250 90 90','Hoofdkantoor','Torenallee 20','5617 BC','Eindhoven',51.4480,5.4550,[[A,2,'compleet','08:30','14:00',2],[A,2,'interieur','08:30','14:00',2],[B,2,'buiten','','',1]]],
   ['Installatietechniek Helmond','Sandra Verhoeven','0492 555 010','Depot','Varenschut 4','5705 DK','Helmond',51.4700,5.6500,[[A,3,'bedrijfswagen','13:00','17:00',2]]],
   ['Logistiek Veghel','Erik van Rooij','0413 380 200','DC Noord','Doornhoek 3800','5466 SB','Veghel',51.6150,5.5400,[[A,2,'buiten','','',1],[A,1,'compleet','','',1]]],
   ['Notariskantoor Oss','mr. J. Claassen','0412 640 640','Kantoor','Molenstraat 50','5342 CB','Oss',51.7700,5.5300,[[A,2,'interieur','08:00','10:30',3]]],
   ['Hotel De Eemhof','Receptie','033 422 10 00','Gastenparkeerplaats','Stichtse Rotonde 11','3824 MA','Amersfoort',52.1700,5.4100,[[A,2,'compleet','10:00','16:00',1]]]
  ];
  SPEC.forEach((s,i)=>{const cid='c'+(i+1),lid='l'+(i+1);
    d.customers.push({id:cid,name:s[0],contact:s[1],phone:s[2],email:''});
    d.locations.push({id:lid,customerId:cid,name:s[3],address:s[4],postcode:s[5],city:s[6],lat:s[7],lng:s[8],geo:'manual'});
    s[9].forEach(([date,n,type,from,to,prio])=>{for(let k=0;k<n;k++){const van=type==='bedrijfswagen';d.jobs.push({id:'j'+(d.jobs.length+1),plate:plate(),vehicle:(van?VANS:CARS)[Math.floor(r()*(van?VANS:CARS).length)],locationId:lid,date,from,to,type,duration:'',priority:prio,notes:''})}});
  });
  d.workers=[
   {id:'w1',name:'Mark de Vries',postcode:'5301 BK',city:'Zaltbommel',lat:51.810,lng:5.248,geo:'pc4',start:'08:00',end:'16:30',days:[1,2,3,4,5],absent:[],skills:['bedrijfswagens'],color:0},
   {id:'w2',name:'Sanne Jansen',postcode:'3523 CK',city:'Utrecht',lat:52.070,lng:5.110,geo:'pc4',start:'07:30',end:'16:00',days:[1,2,3,4,5],absent:[],skills:['coating'],color:1},
   {id:'w3',name:'Youssef El Amrani',postcode:'5615 AB',city:'Eindhoven',lat:51.450,lng:5.470,geo:'pc4',start:'08:00',end:'17:00',days:[1,2,3,4,5],absent:[],skills:['bedrijfswagens','coating'],color:2},
   {id:'w4',name:'Lisa Bakker',postcode:'4001 AA',city:'Tiel',lat:51.886,lng:5.429,geo:'pc4',start:'08:30',end:'15:00',days:[1,2,3,4],absent:[],skills:[],color:3},
   {id:'w5',name:'Tom Peters',postcode:'6511 AB',city:'Nijmegen',lat:51.842,lng:5.853,geo:'pc4',start:'08:00',end:'16:30',days:[1,2,3,4,5],absent:['2026-10-29'],skills:['bedrijfswagens'],color:4}
  ];
  d.workers.forEach((w,i)=>{w.token=randTok();w.leaveDays=[25,25,24,20,25][i]});
  d.absences=[{id:'a_s1',wid:'w5',type:'vakantie',from:'2026-10-29',to:'2026-10-30',part:'',time:'',note:'Herfstvakantie',at:0},
    {id:'a_s2',wid:'w2',type:'training',from:'2026-11-12',to:'2026-11-12',part:'',time:'',note:'Cursus keramische coating',at:0},
    {id:'a_s3',wid:'w3',type:'arts',from:'2026-11-04',to:'2026-11-04',part:'laat',time:'10:00',note:'Tandarts',at:0},
    {id:'a_s4',wid:'w1',type:'vakantie',from:'2026-08-03',to:'2026-08-21',part:'',time:'',note:'Zomervakantie',at:0},
    {id:'a_s5',wid:'w4',type:'vrij',from:'2026-11-19',to:'2026-11-19',part:'',time:'',note:'',at:0}];
  return d;
}
function load(){try{const raw=typeof localStorage!=='undefined'&&localStorage.getItem(KEY);if(raw){const x=JSON.parse(raw);if(x&&x.version)D=x}}catch(e){}if(!D)D=sample();/* Bij openen altijd vandaag; binnen hetzelfde tabblad (herladen) blijft de gekozen datum staan */S.date=todayIso();try{const sd=sessionStorage.getItem('wasroute.date');if(sd&&/^\d{4}-\d\d-\d\d$/.test(sd))S.date=sd}catch(e){}if(D.ui&&D.ui.pview)S.pview=D.ui.pview;index();D.workers.forEach(w=>{if(!w.token)w.token=randTok()});
  if(D.settings.maxPreTravel===undefined)D.settings.maxPreTravel=60;if(!D.settings.travelSource)D.settings.travelSource='schatting';
  if(D.settings.startAtFirst===undefined){D.settings.startAtFirst=true;D.settings.endAtLast=false;for(const d of Object.keys(D.plans))if(!D.plans[d].edited&&jobsOn(d).length)autoPlan(d);save()}}
function save(){D.ui={date:S.date,pview:S.pview||'dag'};try{sessionStorage.setItem('wasroute.date',S.date)}catch(e){}LEGS.clear();index();try{localStorage.setItem(KEY,JSON.stringify(D))}catch(e){}schedulePush()}

