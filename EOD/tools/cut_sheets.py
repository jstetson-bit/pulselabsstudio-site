# Pulse art cutter: sheet -> transparent Doom-size sprites + manifest (used for res/art)
from PIL import Image
import numpy as np, json, os
from scipy import ndimage as nd
def outside_bg(a, thr, edges='tlrb'):
    lum=a.max(axis=2).astype(int); sat=lum-a.min(axis=2).astype(int)
    bg=(lum<thr)&(sat<22); lab,n=nd.label(bg); e=[]
    for k,v in (('t',lab[0]),('b',lab[-1]),('l',lab[:,0]),('r',lab[:,-1])):
        if k in edges: e.append(v)
    ids=set(np.unique(np.concatenate(e)))-{0}; return np.isin(lab,list(ids))
def clean(fg, minpx=40):
    lab,n=nd.label(fg); 
    if n==0: return fg
    sz=nd.sum(fg,lab,range(1,n+1)); keep=[i+1 for i,s in enumerate(sz) if s>=minpx]; return np.isin(lab,keep)
def finish(im, s, fn):
    im2=im.resize((max(1,round(im.width*s)),max(1,round(im.height*s))),Image.LANCZOS); ar=np.array(im2); ar[:,:,3]=np.where(ar[:,:,3]>120,255,0); Image.fromarray(ar).save(fn); return im2.size
os.makedirs('out',exist_ok=True)
M=[('husk_trooper','Husk Trooper','soldier',56),('iron_trooper','Iron Trooper','soldier',60),('gore_ape','Gore Ape','beast',62),('ash_fiend','Ash Fiend','imp',58),('siege_brute','Siege Brute','cyber',96),
   ('mind_eye','Mind Eye','floater',56),('steel_widow','Steel Widow','crawler',58),('bile_hulk','Bile Hulk','hulk',72),('ember_monk','Ember Monk','imp',60),('gargant_bat','Gargant Bat','floater',52),
   ('spine_hound','Spine Hound','beast',44),('bone_gunner','Bone Gunner','soldier',66),('bile_ooze','Bile Ooze','beast',40),('crowned_skull','Crowned Skull','floater',44),('stone_hulk','Stone Hulk','hulk',80),
   ('plague_mite','Plague Mite','crawler',44),('blood_juggernaut','Blood Juggernaut','cyber',90),('maw_tangle','Maw Tangle','floater',56),('sentry_mech','Sentry Mech','cyber',84),('void_baron','Void Baron','hulk',88)]
a=np.array(Image.open('/mnt/user-data/uploads/7e0e6336-image.png').convert('RGB'))
bg=outside_bg(a,30); fg=clean(~bg,60)
lab,n=nd.label(nd.binary_dilation(fg,iterations=6)); objs=nd.find_objects(lab); sizes=nd.sum(fg,lab,range(1,n+1))
big=[(o,i+1) for i,(o,s) in enumerate(zip(objs,sizes)) if s>3000]; big.sort(key=lambda t:(round((t[0][0].start+t[0][0].stop)/2/256), t[0][1].start))
man={'monsters':[],'weapons':[]}
for (o,li),(k,name,arch,h) in zip(big,M):
    m=fg&(lab==li); ys,xs=o; c=a[ys,xs]; mk=m[ys,xs]
    im=Image.fromarray(np.dstack([c,np.where(mk,255,0)]).astype(np.uint8),'RGBA'); im=im.crop(im.getbbox())
    w,hh=finish(im,h/im.height,f'out/m_{k}.png'); man['monsters'].append({'id':k,'name':name,'arch':arch,'h':h,'w':w})
W=[('pump1','Pump Shotgun Mk.I','shotgun',(113,275,10,500)),('pump2','Pump Shotgun Mk.II','shotgun',(113,275,518,1008)),('pump3','Pump Shotgun Mk.III','shotgun',(113,275,1028,1520)),
   ('dbl1','Octagon Double Barrel','shotgun',(293,445,10,725)),('dbl2','Tactical Octagon','shotgun',(293,445,745,1520)),
   ('mini1','Rotary Minigun','repeater',(463,617,10,742)),('mini2','Storm Minigun','repeater',(463,617,762,1520)),
   ('missile','Missile Launcher','explosive',(635,780,10,725)),('particle','Particle Cannon','energy',(635,780,745,1520)),
   ('grinder','Angle Grinder','melee',(797,990,10,460)),('chainsaw','Chain Ripper','melee',(797,990,478,922)),('runner','Run-and-Gun Rifle','repeater',(797,990,940,1520))]
b=np.array(Image.open('/mnt/user-data/uploads/39ab1cc2-image.png').convert('RGB'))
for k,name,cls,(y0,y1,x0,x1) in W:
    c=b[y0+36:y1-4, x0+6:x1-6]; fg=clean(~outside_bg(c,24,'tlr'),40)
    col=fg.sum(axis=0); w=len(col); runs=[]; s=None
    for x in range(w):
        if col[x]<=1:
            if s is None: s=x
        elif s is not None: runs.append((s,x)); s=None
    inner=[r for r in runs if r[0]>w*0.12 and r[1]<w*0.88]; inner.sort(key=lambda r:r[1]-r[0], reverse=True)
    cuts=sorted([(r[0]+r[1])//2 for r in inner[:2]]); 
    if len(cuts)<2: cuts=[w//3,2*w//3]
    bnd=[0]+cuts+[w]; ims=[]
    for j in range(3):
        sl=slice(bnd[j],bnd[j+1]); mk=clean(fg[:,sl],60); cc=c[:,sl]
        im=Image.fromarray(np.dstack([cc,np.where(mk,255,0)]).astype(np.uint8),'RGBA'); bb=im.getbbox()
        if bb: ims.append(im.crop(bb))
    s=92/ims[0].height
    for j,im in enumerate(ims): finish(im,s,f'out/w_{k}_{["idle","fire","alt"][j]}.png')
    pk=ims[-1]; finish(pk,22/pk.height,f'out/w_{k}_pick.png')
    man['weapons'].append({'id':k,'name':name,'cls':cls})
json.dump(man,open('out/manifest.json','w'),indent=1); print('ok',len(man['monsters']),len(man['weapons']))
