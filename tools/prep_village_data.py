import json,math,random
random.seed(5)
d=json.load(open('export.geojson'))
S=10; lon0=74.3485; lat0=43.1919
kx=111320*math.cos(math.radians(lat0))/S; kz=110540/S
hx=0.015*kx; hz=0.0129*kz
def P(c): return [(c[0]-lon0)*kx, -(c[1]-lat0)*kz]
def clip_seg(a,b):
    x0,z0=a;x1,z1=b;dx=x1-x0;dz=z1-z0;t0,t1=0.0,1.0
    for p,q in ((-dx,x0+hx),(dx,hx-x0),(-dz,z0+hz),(dz,hz-z0)):
        if abs(p)<1e-12:
            if q<0:return None
        else:
            r=q/p
            if p<0:
                if r>t1:return None
                t0=max(t0,r)
            else:
                if r<t0:return None
                t1=min(t1,r)
    return (x0+t0*dx,z0+t0*dz),(x0+t1*dx,z0+t1*dz),t1<1
def clip_line(pts):
    runs=[];cur=[]
    for a,b in zip(pts,pts[1:]):
        s=clip_seg(a,b)
        if not s:
            if len(cur)>1:runs.append(cur)
            cur=[];continue
        if not cur: cur=[s[0]]
        elif math.hypot(cur[-1][0]-s[0][0],cur[-1][1]-s[0][1])>1e-6:
            if len(cur)>1:runs.append(cur)
            cur=[s[0]]
        cur.append(s[1])
        if s[2]:
            runs.append(cur);cur=[]
    if len(cur)>1:runs.append(cur)
    return runs
def dp(pts,tol):
    if len(pts)<3:return pts
    a=pts[0];b=pts[-1];best=0;bi=0
    dx=b[0]-a[0];dz=b[1]-a[1];l=math.hypot(dx,dz) or 1e-9
    for i in range(1,len(pts)-1):
        dd=abs((pts[i][0]-a[0])*dz-(pts[i][1]-a[1])*dx)/l
        if dd>best:best=dd;bi=i
    if best<=tol:return [a,b]
    return dp(pts[:bi+1],tol)[:-1]+dp(pts[bi:],tol)
def clip_poly(poly):
    def edge(pts,inside,inter):
        out=[]
        for i in range(len(pts)):
            c=pts[i];p=pts[i-1]
            if inside(c):
                if not inside(p):out.append(inter(p,c))
                out.append(c)
            elif inside(p):out.append(inter(p,c))
        return out
    def ix(k,v):
        def f(p,c):
            t=(v-p[k])/(c[k]-p[k]);return (p[0]+t*(c[0]-p[0]),p[1]+t*(c[1]-p[1]))
        return f
    for k,v,sg in ((0,-hx,1),(0,hx,-1),(1,-hz,1),(1,hz,-1)):
        if not poly:break
        poly=edge(poly,(lambda q,k=k,v=v,sg=sg:(q[k]-v)*sg>=0),ix(k,v))
    return poly
def r2(p):return [round(p[0],2),round(p[1],2)]
def obb(ring):
    pts=[P(c) for c in ring[:-1]];best=None
    for i in range(len(pts)):
        a=pts[i];b=pts[(i+1)%len(pts)]
        th=math.atan2(b[1]-a[1],b[0]-a[0]);c=math.cos(th);s=math.sin(th)
        us=[p[0]*c+p[1]*s for p in pts];vs=[-p[0]*s+p[1]*c for p in pts]
        wu=max(us)-min(us);wv=max(vs)-min(vs)
        if best is None or wu*wv<best[0]:best=(wu*wv,th,wu,wv,(max(us)+min(us))/2,(max(vs)+min(vs))/2)
    _,th,wu,wv,cu,cv=best
    cx=cu*math.cos(th)-cv*math.sin(th);cz=cu*math.sin(th)+cv*math.cos(th)
    if wu>wv:th+=math.pi/2;wu,wv=wv,wu
    return cx,cz,wu,wv,-th
RW={'living_street':.9,'residential':1.1,'service':.7,'tertiary':1.8,'track':.6,'unclassified':1.1}
WW={'river':5,'stream':1.2}
B=[];R=[];Wt=[];L=[];labels=[];cart=[]
for f in d['features']:
    p=f['properties'];g=f['geometry']
    if 'building' in p and g['type']=='Polygon':
        cx,cz,wu,wv,ph=obb(g['coordinates'][0])
        if abs(cx)>hx or abs(cz)>hz or wu*wv<.2:continue
        w=max(wu*1.3,.9);dd=max(wv*1.3,w)
        B.append([round(cx,2),round(cz,2),round(w,2),round(dd,2),round(ph,3)])
    elif 'highway' in p and p['highway'] in RW:
        pts=[P(c) for c in g['coordinates']]
        for run in clip_line(pts):
            run=dp(run,.12)
            R.append({'c':p['highway'],'p':[r2(q) for q in run]})
            if p.get('name')=='Фрунзе улица':
                cart=run
            if p.get('name') in('Фрунзе улица','Гагарина улица') and len(run)>1:
                m=run[len(run)//2];labels.append({'n':p['name'].replace(' улица',''),'x':round(m[0],1),'z':round(m[1],1)})
    elif 'waterway' in p and p['waterway'] in WW:
        pts=[P(c) for c in g['coordinates']]
        for run in clip_line(pts):
            run=dp(run,.2);Wt.append({'k':p['waterway'],'p':[r2(q) for q in run]})
    elif 'landuse' in p and p['landuse'] in('farmland','forest','residential','cemetery') and g['type']=='Polygon':
        poly=clip_poly([tuple(P(c)) for c in g['coordinates'][0][:-1]])
        if len(poly)>2:L.append({'k':p['landuse'],'p':[r2(q) for q in dp(poly+[poly[0]],.15)[:-1]]})
# cart path sampled
cp=[]
for a,b in zip(cart,cart[1:]):
    l=math.hypot(b[0]-a[0],b[1]-a[1]);n=max(1,int(l/.5))
    for i in range(n):cp.append(r2((a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n)))
# village center
import statistics
cx=statistics.median(b[0] for b in B);cz=statistics.median(b[1] for b in B)
seen=set();lab2=[]
for l in labels:
    if l['n'] in seen:continue
    seen.add(l['n']);lab2.append(l)
labels=lab2
labels.insert(0,{'n':'Нижнечуйское','x':round(cx,1),'z':round(cz,1),'main':1})
# trees
def inpoly(x,z,poly):
    c=False;j=len(poly)-1
    for i in range(len(poly)):
        xi,zi=poly[i];xj,zj=poly[j]
        if (zi>z)!=(zj>z) and x<(xj-xi)*(z-zi)/(zj-zi)+xi:c=not c
        j=i
    return c
hash_={}
def add(x,z,r):hash_.setdefault((int(x//3),int(z//3)),[]).append((x,z,r))
for b in B:add(b[0],b[1],max(b[2],b[3])/2*1.15+.5)
for r in R:
    hw=RW[r['c']]/2+.8
    for a,b in zip(r['p'],r['p'][1:]):
        l=math.hypot(b[0]-a[0],b[1]-a[1]);n=max(1,int(l/.7))
        for i in range(n+1):add(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n,hw)
for w in Wt:
    hw=WW[w['k']]/2+.9
    for a,b in zip(w['p'],w['p'][1:]):
        l=math.hypot(b[0]-a[0],b[1]-a[1]);n=max(1,int(l/.8))
        for i in range(n+1):add(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n,hw)
def blocked(x,z):
    cx_,cz_=int(x//3),int(z//3)
    for i in(-1,0,1):
        for j in(-1,0,1):
            for (a,b,r) in hash_.get((cx_+i,cz_+j),[]):
                if (a-x)**2+(b-z)**2<r*r:return True
    return False
T=[]
def tr(x,z,pine):T.append([round(x,2),round(z,2),1 if pine else 0,round(.8+random.random()*.55,2)])
def fill(poly,sp,prob,cap):
    xs=[q[0] for q in poly];zs=[q[1] for q in poly];n=0
    x=min(xs)
    while x<max(xs):
        z=min(zs)
        while z<max(zs):
            px=x+(random.random()-.5)*sp*.8;pz=z+(random.random()-.5)*sp*.8
            if random.random()<prob and inpoly(px,pz,poly) and not blocked(px,pz) and abs(px)<hx-.8 and abs(pz)<hz-.8:
                tr(px,pz,random.random()<.55);n+=1
                if n>=cap:return
            z+=sp
        x+=sp
for l in L:
    if l['k']=='forest':fill(l['p'],2.2,.85,900)
bc=[(b[0],b[1]) for b in B]
gx=-hx
while gx<hx:
    gz=-hz
    while gz<hz:
        px=gx+random.random()*3.2;pz=gz+random.random()*3.2
        if abs(px)<hx-.8 and abs(pz)<hz-.8 and random.random()<.5 and not blocked(px,pz) and any((px-a)**2+(pz-b)**2<64 for a,b in bc):
            tr(px,pz,random.random()<.3)
        gz+=3.4
    gx+=3.4
farm=[l['p'] for l in L if l['k'] in('farmland','cemetery')]
x=-hx
while x<hx:
    z=-hz
    while z<hz:
        px=x+random.random()*6;pz=z+random.random()*6
        if random.random()<.3 and abs(px)<hx-.8 and abs(pz)<hz-.8 and not blocked(px,pz) and not any(inpoly(px,pz,f) for f in farm):
            tr(px,pz,random.random()<.4)
        z+=7
    x+=7
out={'hx':round(hx,2),'hz':round(hz,2),'lon0':lon0,'lat0':lat0,'kx':kx,'kz':kz,'b':B,'r':R,'w':Wt,'l':L,'t':T,'lab':labels,'cp':cp}
json.dump(out,open('data.json','w'),separators=(',',':'),ensure_ascii=False)
import os
print('hx,hz',hx,hz,'bld',len(B),'roads',len(R),'water',len(Wt),'land',len(L),'trees',len(T),'cart',len(cp),'size',os.path.getsize('data.json'))
print(labels)
