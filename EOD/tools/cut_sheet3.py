from PIL import Image
import numpy as np, json, os
from scipy import ndimage as nd
A=np.array(Image.open('/mnt/user-data/uploads/80a08834-image.png').convert('RGB'))
def bgmask(c,thr=28):
    lum=c.max(axis=2).astype(int); sat=lum-c.min(axis=2).astype(int); bg=(lum<thr)&(sat<20)
    lab,n=nd.label(bg); ids=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}; return np.isin(lab,list(ids))

def purge(fg, c):
    lab,n=nd.label(fg); keep=np.zeros(n+1,bool)
    for i,o in enumerate(nd.find_objects(lab)):
        h=o[0].stop-o[0].start; w=o[1].stop-o[1].start; m=(lab[o]==i+1); s=m.sum(); cc=c[o]
        red=((cc[:,:,0]>140)&(cc[:,:,1]<80)&(cc[:,:,2]<80)&m).sum()/max(1,s)
        if min(h,w)<=4 and max(h,w)>12: continue
        if s/(h*w)<0.12 and max(h,w)>60: continue
        if red>0.55 and s<1500: continue
        if s<12: continue
        keep[i+1]=True
    return keep[lab]
def comps(y0,y1,x0,x1,thr=28,dil=4,minpx=400):
    c=A[y0:y1,x0:x1]; fg=purge(~bgmask(c,thr),c)
    lab0,n0=nd.label(fg); sz=nd.sum(fg,lab0,range(1,n0+1)); fg=np.isin(lab0,[i+1 for i,s in enumerate(sz) if s>=25])
    lab,n=nd.label(nd.binary_dilation(fg,iterations=dil)); out=[]
    for i,o in enumerate(nd.find_objects(lab)):
        m=fg&(lab==i+1); s=m.sum()
        if s<minpx: continue
        cc=c[o]; mm=m[o]; red=((cc[:,:,0]>140)&(cc[:,:,1]<70)&(cc[:,:,2]<70)&mm).sum()/max(1,mm.sum())
        if red>0.6 and s<1500: continue  # red arrows
        h,w=mm.shape
        if (h<6 or w<6) or (mm.sum()/(h*w)<0.08 and max(h,w)>150): continue  # border lines
        out.append({'y':o[0].start+y0,'x':o[1].start+x0,'img':Image.fromarray(np.dstack([cc,np.where(mm,255,0)]).astype(np.uint8),'RGBA')})
    return out
def save(im,s,fn):
    im2=im.resize((max(1,round(im.width*s)),max(1,round(im.height*s))),Image.LANCZOS); ar=np.array(im2); ar[:,:,3]=np.where(ar[:,:,3]>120,255,0); Image.fromarray(ar).save(fn); return im2.size
os.makedirs('out3',exist_ok=True)
man={'monsters':[],'weapons':[],'pickups':[],'sequences':[]}
# 5x5 monster grid
RY=[12,136,258,370,490,614]; CX=[12,174,338,502,666,830]
names=[('grunt2','Grunt','soldier',56),('heavy_grunt','Heavy Grunt','soldier',60),('hell_hyena','Hell Hyena','beast',44),('gaze_orb','Gaze Orb','floater',54),('wraith_bat','Wraith Bat','floater',50),
 ('red_widow','Red Widow','crawler',52),('rot_belly','Rot Belly','hulk',70),('hex_monk','Hex Monk','imp',60),('moss_golem','Moss Golem','hulk',78),('war_drone','War Drone','cyber',80),
 ('slime_lord','Slime Lord','beast',44),('axe_bull','Axe Bull','beast',64),('blue_crown','Blue Crown','floater',46),('husk_mantis','Husk Mantis','imp',62),('magma_fiend','Magma Fiend','imp',64),
 ('frost_knight','Frost Knight','soldier',64),('grave_worm','Grave Worm','beast',50),('spore_cap','Spore Cap','imp',54),('crab_horror','Crab Horror','crawler',46),('void_squid','Void Squid','floater',58),
 ('scrap_hound','Scrap Hound','beast',46),('serpent_drake','Serpent Drake','floater',60),('armored_ogre','Armored Ogre','hulk',74),('gatling_brute','Gatling Brute','cyber',88),('inferno_lord','Inferno Lord','hulk',96)]
k=0
for r in range(5):
  for cI in range(5):
    cs=comps(RY[r]+6,RY[r+1]-6,CX[cI]+6,CX[cI+1]-6,minpx=600)
    cs.sort(key=lambda d:-(np.array(d['img'])[:,:,3]>0).sum()); im=cs[0]['img']; im=im.crop(im.getbbox())
    nid,nm,arch,h=names[k]; w,_=save(im,h/im.height,f'out3/m_{nid}.png'); man['monsters'].append({'id':nid,'name':nm,'arch':arch,'h':h,'w':w}); k+=1
# rotation set + death sequence (one monster)
rot=sorted(comps(15,224,848,1666,minpx=1500),key=lambda d:d['x']); print('rot',len(rot))
dea=sorted(comps(228,362,848,1666,minpx=200),key=lambda d:d['x']); print('death',len(dea))
H=84; s=H/rot[0]['img'].crop(rot[0]['img'].getbbox()).height
for i,d in enumerate(rot[:5]): im=d['img'].crop(d['img'].getbbox()); save(im,s,f'out3/m_spine_baron_r{i+1}.png')
s2=s*1.0
for i,d in enumerate(dea[:6]): im=d['img'].crop(d['img'].getbbox()); save(im,s2,f'out3/m_spine_baron_d{i+1}.png')
w0=Image.open('out3/m_spine_baron_r1.png').width
man['monsters'].append({'id':'spine_baron','name':'Spine Baron','arch':'hulk','h':H,'w':w0,'rots':min(5,len(rot)),'death':min(6,len(dea))})
# pickups (world items)
pk=sorted(comps(383,517,845,1666,minpx=800),key=lambda d:d['x'])+sorted(comps(519,616,845,1666,minpx=800),key=lambda d:d['x'])
pn=['spear','knife','sawblade','storm_minigun','octagon_shotgun','bazooka','void_cannon','grinder2','chainsaw2','pulse_rifle']
print('pickups',len(pk))
for i,d in enumerate(pk[:10]): im=d['img'].crop(d['img'].getbbox()); save(im,26/max(im.height,im.width/2.2),f'out3/p_{pn[i]}.png'); man['pickups'].append(pn[i])
# firing sequences: bottom panels
panels=[(10,546,[(646,724),(726,808),(810,912)],['spear','knife','sawblade']),(550,1096,[(646,724),(726,808),(810,912)],['storm_minigun','octagon_shotgun','bazooka']),
        (1100,1666,[(646,716),(718,786),(788,846),(848,912)],['void_cannon','grinder2','chainsaw2','pulse_rifle'])]
for x0,x1,rows,ids in panels:
    for (y0,y1),wid in zip(rows,ids):
        cs=sorted(comps(y0,y1,x0+4,x1-4,minpx=150,dil=3),key=lambda d:d['x'])
        print(wid,len(cs),[d['img'].size for d in cs])
        hh=max(d['img'].height for d in cs[:1]) 
        s=60/cs[0]['img'].crop(cs[0]['img'].getbbox()).height
        for i,d in enumerate(cs): im=d['img'].crop(d['img'].getbbox()); save(im,s,f'out3/s_{wid}_{i+1}.png')
        man['sequences'].append({'id':wid,'frames':len(cs)})
json.dump(man,open('out3/manifest3.json','w'),indent=1)

# ---- second pass: split merged strips by low-density columns ----
def strip(y0,y1,x0,x1,N,thr=28):
    c=A[y0:y1,x0:x1]; fg=purge(~bgmask(c,thr),c)
    red=(c[:,:,0]>140)&(c[:,:,1]<70)&(c[:,:,2]<70); 
    col=nd.uniform_filter1d(fg.sum(axis=0).astype(float),5); w=len(col); cuts=[]
    order=np.argsort(col); mind=w/(N*1.8)
    for x in order:
        if x<mind*0.6 or x>w-mind*0.6: continue
        if all(abs(x-cx)>=mind for cx in cuts): cuts.append(x)
        if len(cuts)==N-1: break
    cuts=sorted(cuts); b=[0]+cuts+[w]; out=[]
    for i in range(N):
        sl=slice(b[i],b[i+1]); m=fg[:,sl].copy(); lab,n=nd.label(m)
        if n: sz=nd.sum(m,lab,range(1,n+1)); m=np.isin(lab,[j+1 for j,s in enumerate(sz) if s>=20])
        if m.sum()<60: continue
        rr=(red[:,sl]&m).sum()/m.sum()
        if rr>0.5 and m.sum()<900: continue  # arrow
        im=Image.fromarray(np.dstack([c[:,sl],np.where(m,255,0)]).astype(np.uint8),'RGBA'); out.append(im.crop(im.getbbox()))
    return out
import glob
for f in glob.glob('out3/m_spine_baron_*')+glob.glob('out3/s_*')+glob.glob('out3/p_*'): os.remove(f)
rot=strip(15,224,848,1666,5); dea=strip(228,362,848,1666,6)
s=84/rot[0].height
for i,im in enumerate(rot): save(im,s,f'out3/m_spine_baron_r{i+1}.png')
for i,im in enumerate(dea): save(im,s,f'out3/m_spine_baron_d{i+1}.png')
man['monsters'][-1].update({'rots':len(rot),'death':len(dea),'w':Image.open('out3/m_spine_baron_r1.png').width})
print('rot',len(rot),'death',len(dea))
pn=['spear','knife','sawblade','storm_minigun','octagon_shotgun','bazooka','void_cannon','grinder2','chainsaw2','pulse_rifle']; man['pickups']=[]
xs=np.linspace(845,1666,6).astype(int)
for r,(y0,y1) in enumerate([(386,515),(521,614)]):
    for cI in range(5):
        cs=comps(y0+4,y1-4,xs[cI]+6,xs[cI+1]-6,minpx=300); cs.sort(key=lambda d:-(np.array(d['img'])[:,:,3]>0).sum())
        im=cs[0]['img'].crop(cs[0]['img'].getbbox()); nm=pn[r*5+cI]; save(im,24/im.height if im.width<im.height*2.5 else 60/im.width,f'out3/p_{nm}.png'); man['pickups'].append(nm)
counts={'spear':7,'knife':7,'sawblade':6,'storm_minigun':6,'octagon_shotgun':5,'bazooka':5,'void_cannon':6,'grinder2':6,'chainsaw2':5,'pulse_rifle':6}
man['sequences']=[]
for x0,x1,rows,ids in panels:
    for (y0,y1),wid in zip(rows,ids):
        ims=strip(y0,y1,x0+4,x1-4,counts[wid]); ims=[i for i in ims if i.width*i.height>400]; s=60/max(i.height for i in ims)
        for i,im in enumerate(ims): save(im,s,f'out3/s_{wid}_{i+1}.png')
        man['sequences'].append({'id':wid,'frames':len(ims)}); print(wid,len(ims),[i.size for i in ims])
json.dump(man,open('out3/manifest3.json','w'),indent=1)

# ---- third pass: hand-measured frame boxes for the firing sequences ----
for f in glob.glob('out3/s_*'): os.remove(f)
L=[(645,722),(727,806),(810,910)]; Mi=[(645,720),(727,806),(810,905)]; R=[(645,718),(722,790),(795,842),(845,912)]
SEQ={'spear':(L[0],[(30,145),(170,235),(240,320),(320,395),(395,470),(475,535)]),
 'knife':(L[1],[(30,120),(140,215),(240,315),(310,395),(395,470),(460,530)]),
 'sawblade':(L[2],[(30,135),(180,275),(280,375),(380,455),(455,535)]),
 'storm_minigun':(Mi[0],[(560,645),(690,770),(780,865),(870,975),(980,1085)]),
 'octagon_shotgun':(Mi[1],[(565,650),(690,770),(795,885),(895,975),(985,1065)]),
 'bazooka':(Mi[2],[(560,690),(715,820),(820,950),(950,1085)]),
 'void_cannon':(R[0],[(1110,1195),(1220,1300),(1315,1390),(1400,1480),(1490,1658)]),
 'grinder2':(R[1],[(1115,1190),(1222,1318),(1328,1422),(1428,1522),(1528,1655)]),
 'chainsaw2':(R[2],[(1115,1188),(1222,1308),(1328,1412),(1422,1512),(1518,1655)]),
 'pulse_rifle':(R[3],[(1108,1218),(1228,1332),(1332,1425),(1438,1535),(1552,1662)])}
man['sequences']=[]
for wid,((y0,y1),xs) in SEQ.items():
    ims=[]
    for (x0,x1) in xs:
        c=A[y0:y1,x0:x1]; fg=~bgmask(c,26)
        lab,n=nd.label(fg); keep=np.zeros(n+1,bool)
        for i,o in enumerate(nd.find_objects(lab)):
            h=o[0].stop-o[0].start; w=o[1].stop-o[1].start; m=lab[o]==i+1; s_=m.sum()
            if h<=4 and w>20: continue   # shelf lines
            if s_<10: continue
            keep[i+1]=True
        m=keep[lab]; im=Image.fromarray(np.dstack([c,np.where(m,255,0)]).astype(np.uint8),'RGBA'); bb=im.getbbox()
        if bb: ims.append(im.crop(bb))
    s=60/max(i.height for i in ims[:1])
    for i,im in enumerate(ims): save(im,s,f'out3/s_{wid}_{i+1}.png')
    man['sequences'].append({'id':wid,'frames':len(ims)})
json.dump(man,open('out3/manifest3.json','w'),indent=1)
print('seq ok')
