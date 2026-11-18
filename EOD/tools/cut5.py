from PIL import Image
import numpy as np, json, os
from scipy import ndimage as nd
S=['/mnt/user-data/uploads/fa3d5d15-image.png','/mnt/user-data/uploads/dee55e87-image.png','/mnt/user-data/uploads/bd3bc3f0-image.png','/mnt/user-data/uploads/236d6dd1-image.png']
A=[np.array(Image.open(f).convert('RGB')) for f in S]
def mask(c,thr=34):
    lum=c.max(axis=2).astype(int); sat=lum-c.min(axis=2).astype(int); bg=(lum<thr)&(sat<28)
    lab,n=nd.label(bg); ids=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    fg=~np.isin(lab,list(ids))
    # purge thin lines
    l2,n2=nd.label(fg); keep=np.zeros(n2+1,bool)
    for i,o in enumerate(nd.find_objects(l2)):
        h=o[0].stop-o[0].start; w=o[1].stop-o[1].start; s=(l2[o]==i+1).sum()
        if s<12: continue
        if min(h,w)<=4 and max(h,w)>15: continue
        if s/(h*w)<0.1 and max(h,w)>50: continue
        keep[i+1]=True
    return keep[l2]
def split(c,N=None,mingap=3,minpx=150):
    fg=mask(c); col=fg.sum(axis=0); w=len(col)
    if N:
        sm=np.convolve(col,np.ones(5)/5,'same'); order=np.argsort(sm); mind=w/(N*1.7); cuts=[]
        for x in order:
            if x<mind*.5 or x>w-mind*.5: continue
            if all(abs(x-c0)>=mind for c0 in cuts): cuts.append(x)
            if len(cuts)==N-1: break
        b=[0]+sorted(cuts)+[w]
    else:
        empty=col<=1; b=[0]; x=0
        while x<w:
            if empty[x]:
                s=x
                while x<w and empty[x]: x+=1
                if x-s>=mingap and s>0 and x<w: b.append((s+x)//2)
            x+=1
        b.append(w)
    out=[]
    for i in range(len(b)-1):
        m=fg[:,b[i]:b[i+1]]
        if m.sum()<minpx: continue
        im=Image.fromarray(np.dstack([c[:,b[i]:b[i+1]],np.where(m,255,0)]).astype(np.uint8),'RGBA'); out.append(im.crop(im.getbbox()))
    return out
os.makedirs('out',exist_ok=True)
MON=[ (0,[(8,98),(100,198),(200,298),(300,400),(402,502)],[(8,405,410,762,4),(772,1175,1178,1530,4)]),
      (1,[(5,140),(143,247),(250,365),(367,493),(495,625)],[(5,715,718,1530,6)]),
      (2,[(5,115),(118,245),(248,372),(375,495),(498,615)],[(8,830,836,1530,5)]),
      (3,[(5,88),(90,170),(172,252),(254,335),(337,410),(412,490),(492,570),(572,648)],[(128,662,666,1530,7)])]
mons=[]
for si,rows,cols in MON:
    for (x0,x1,x2,x3,nd_) in cols:
        for (y0,y1) in rows:
            ang=split(A[si][y0:y1,x0:x1],5); de=split(A[si][y0:y1,x2:x3],nd_)
            mons.append((si,y0,x0,ang,de))
print('monsters',len(mons),[ (len(m[3]),len(m[4])) for m in mons])
WEP=[(0,[(518,597),(600,676),(678,754),(757,834),(837,915)],[(8,893),(898,1530)]),(0,[(920,1015)],[(8,1530)]),
     (1,[(638,725)],[(12,525),(528,1007),(1010,1530)]),(1,[(728,808)],[(12,480),(483,968),(970,1530)]),(1,[(810,898)],[(12,522),(525,1027),(1030,1530)]),(1,[(902,1015)],[(12,568),(571,1530)]),
     (2,[(625,693),(696,760),(763,828)],[(8,968),(972,1530)]),(2,[(840,935),(937,1015)],[(8,325),(328,620),(623,915),(918,1213),(1216,1530)]),
     (3,[(670,750),(755,835)],[(8,752),(756,1530)]),(3,[(840,908)],[(8,655),(658,1280),(1283,1530)]),(3,[(912,1015)],[(8,505),(508,1030),(1033,1530)])]
weps=[]
for si,rows,cols in WEP:
    for (y0,y1) in rows:
        for (x0,x1) in cols:
            fr=split(A[si][y0:y1,x0:x1],None,mingap=4,minpx=120); weps.append((si,y0,x0,fr))
print('weapon strips',len(weps),[len(w[3]) for w in weps])
import pickle; pickle.dump((mons,weps),open('cuts.pkl','wb'))
# contact sheets
def sheet(groups,fn,W=1800):
    rows=[]; 
    for g in groups:
        ims=[im for im in g if im.height>0]; 
        if not ims: continue
        s=min(1.0,70/max(i.height for i in ims)); rows.append([i.resize((max(1,int(i.width*s)),max(1,int(i.height*s)))) for i in ims])
    H=sum(max(i.height for i in r)+14 for r in rows); C=Image.new('RGBA',(W,H),(200,200,205,255)); y=0
    from PIL import ImageDraw; d=ImageDraw.Draw(C)
    for k,r in enumerate(rows):
        x=30; d.text((2,y+4),str(k),fill=(0,0,0))
        for i in r: C.paste(i,(x,y),i); x+=i.width+6
        y+=max(i.height for i in r)+14
    C.save(fn)
sheet([m[3]+m[4] for m in mons],'c_mon.png'); sheet([w[3] for w in weps],'c_wep.png')
