import pickle, numpy as np, json, os, glob
from PIL import Image
from scipy import ndimage as nd
def clean(im):
    a=np.array(im.convert('RGBA')); rgb=a[:,:,:3].astype(int); al=a[:,:,3]>0
    lum=rgb.max(axis=2); sat=lum-rgb.min(axis=2); dark=(lum<42)&(sat<30)|~al
    lab,n=nd.label(dark); ids=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    keep=al&~np.isin(lab,list(ids))
    l2,n2=nd.label(keep); ok=np.zeros(n2+1,bool)
    for i,o in enumerate(nd.find_objects(l2)):
        h=o[0].stop-o[0].start; w=o[1].stop-o[1].start; s=(l2[o]==i+1).sum()
        if s<8 or (min(h,w)<=3 and max(h,w)>10) or (s/(h*w)<0.12 and max(h,w)>30): continue
        ok[i+1]=True
    keep=ok[l2]; a[:,:,3]=np.where(keep,255,0); im2=Image.fromarray(a); bb=im2.getbbox(); return im2.crop(bb) if bb else im2
exec(open('cut5.py').read().split("os.makedirs('out'")[0])
mons,weps=pickle.load(open('cuts.pkl','rb'))
NM=[('gore_eye','Gore Eye','floater',50),('azure_skull','Azure Skull','floater',46),('dawn_cleric','Dawn Cleric','imp',62),('magma_brute','Magma Brute','hulk',74),('crimson_crusader','Crimson Crusader','soldier',62),
('blood_gargoyle','Blood Gargoyle','floater',56),('jade_wraith','Jade Wraith','floater',62),('void_sorcerer','Void Sorcerer','imp',64),('goblin_gunner','Goblin Gunner','soldier',52),('flesh_brute','Flesh Brute','hulk',70),
('iron_horn','Iron Horn','hulk',78),('furnace_widow','Furnace Widow','crawler',56),('brain_maw','Brain Maw','floater',58),('bone_templar','Bone Templar','soldier',66),('blue_specter','Blue Specter','floater',60),
('crowned_skull_v','Crowned Void Skull','floater',50),('blood_warlock','Blood Warlock','imp',66),('fallen_seraph','Fallen Seraph','imp',74),('mist_wraith','Mist Wraith','floater',64),('war_crab','War Crab','crawler',56),
('war_mech','War Mech','cyber',80),('ember_golem','Ember Golem','hulk',78),('red_paladin','Red Paladin','soldier',64),('mecha_crab','Mecha Crab','crawler',52),('steel_trooper','Steel Trooper','soldier',58),
('wing_fiend','Wing Fiend','imp',66),('mecha_eye','Mecha Eye','floater',50),('storm_golem','Storm Golem','hulk',80)]
os.makedirs('final',exist_ok=True); man={'monsters':[],'weapons':[]}
for (si,y0,x0,ang,de),(mid,name,arch,h) in zip(mons,NM):
    ang=[clean(i) for i in ang]; de=[clean(i) for i in de]
    s=h/max(i.height for i in ang)
    for k,i in enumerate(ang): i.resize((max(1,round(i.width*s)),max(1,round(i.height*s))),Image.LANCZOS).save(f'final/m_{mid}_r{k+1}.png')
    idx=np.round(np.linspace(0,len(de)-1,5)).astype(int) if len(de)>=5 else range(len(de))
    for k,j in enumerate(idx): i=de[j]; i.resize((max(1,round(i.width*s)),max(1,round(i.height*s))),Image.LANCZOS).save(f'final/m_{mid}_d{k+1}.png')
    w=round(ang[0].width*s)
    man['monsters'].append({'id':mid,'name':name,'arch':arch,'h':h,'w':w,'rots':5,'death':5 if len(de)>=5 else 0})
wm=json.load(open('wout/man.json'))
for e in wm:
    for f in e['frames']+[e['pick']]+([e['proj']] if 'proj' in e else []):
        im=clean(Image.open('wout/'+f)); im.save('final/'+f)
    man['weapons'].append(e)
json.dump(man,open('final/man4.json','w'),indent=1)
print(len(man['monsters']),len(man['weapons']))
# contact for weapons check
ims=[]; 
for e in man['weapons']: ims.append([Image.open('final/'+f) for f in e['frames']]+([Image.open('final/'+e['proj'])] if 'proj' in e else []))
H=sum(max(i.height for i in r)+8 for r in ims); C=Image.new('RGBA',(1400,H),(200,200,205,255)); y=0
for r in ims:
    x=4
    for i in r: C.paste(i,(x,y),i); x+=i.width+4
    y+=max(i.height for i in r)+8
C.save('c_final_w.png')
