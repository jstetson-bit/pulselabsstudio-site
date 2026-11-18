import pickle, numpy as np, json, os
from PIL import Image
exec(open('cut5.py').read().split("os.makedirs('out'")[0])
L=[ # sheet, y0,y1, x0,x1, N, id, name, cls
(0,518,597,8,893,9,'arc_cannon','Arc Cannon','energy'),(0,600,676,8,893,8,'ripper_pump','Ripper Pump','shotgun'),(0,678,754,8,893,8,'hell_gatling','Hell Gatling','repeater'),
(0,757,834,8,893,8,'scorch_launcher','Scorch Launcher','explosive'),(0,837,915,8,893,8,'saw_repeater','Saw Repeater','melee'),
(0,518,597,898,1530,7,'shock_pistol','Shock Pistol','energy'),(0,600,676,898,1530,7,'bone_spear','Bone Spear','thrown'),(0,678,754,898,1530,6,'crusader_dagger','Crusader Dagger','thrown'),
(0,757,834,898,1530,7,'chain_blade','Chain Blade','melee'),(0,837,915,898,1530,6,'reaper_disc','Reaper Disc','thrown'),(0,920,1015,8,1530,11,'saw_shield','Saw Shield','melee'),
(1,638,725,12,525,6,'twin_breacher','Twin Breacher','shotgun'),(1,638,725,528,1007,6,'twin_breacher2','Twin Breacher Mk2','shotgun'),(1,638,725,1010,1530,6,'iron_gatling','Iron Gatling','repeater'),
(1,728,808,12,480,7,'blue_orb_cannon','Blue Orb Cannon','energy'),(1,728,808,483,968,5,'void_lance','Void Lance','energy'),(1,728,808,970,1530,6,'green_bazooka','Green Bazooka','explosive'),
(1,810,898,12,522,6,'war_spear','War Spear','thrown'),(1,810,898,525,1027,5,'shadow_blade','Shadow Blade','thrown'),(1,810,898,1030,1530,5,'hell_axe','Hell Axe','melee'),
(1,902,1015,12,568,4,'gore_chainsaw','Gore Chainsaw','melee'),(1,902,1015,571,1530,8,'buzz_shield','Buzz Shield','melee'),
(2,625,693,8,968,6,'void_repeater','Void Repeater','energy'),(2,696,760,8,968,6,'marksman_rifle','Marksman Rifle','repeater'),(2,763,828,8,968,6,'belt_gatling','Belt Gatling','repeater'),
(2,840,935,8,325,4,'blood_spear','Blood Spear','thrown'),(2,840,935,328,620,4,'twin_knife','Twin Knife','thrown'),(2,840,935,623,915,4,'butcher_blade','Butcher Blade','thrown'),(2,840,935,918,1213,4,'saw_cleaver','Saw Cleaver','melee'),(2,840,935,1216,1530,4,'red_disc','Red Disc','thrown'),
(3,670,750,8,752,8,'pulse_carbine','Pulse Carbine','repeater'),(3,670,750,756,1530,8,'storm_gatling','Storm Gatling','repeater'),(3,755,835,8,752,7,'plasma_maul','Plasma Maul','energy'),(3,755,835,756,1530,7,'siege_bazooka','Siege Bazooka','explosive'),
(3,840,908,8,655,6,'hunter_spear','Hunter Spear','thrown'),(3,840,908,658,1280,5,'hell_sword','Hell Sword','thrown'),(3,912,1015,8,505,6,'ripper_chain','Ripper Chain','melee'),(3,912,1015,508,1030,5,'gore_chain','Gore Chain','melee'),(3,912,1015,1033,1530,5,'flame_disc','Flame Disc','thrown')]
def skin(im):
    a=np.array(im).astype(int); m=a[:,:,3]>0; r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    s=m&(r>g)&(g>b)&(r-b>45)&(r>110)&((g-b)>(r-g)*0.4); return s.sum()/max(1,m.sum())
os.makedirs('wout',exist_ok=True); man=[]; strips=[]
for si,y0,y1,x0,x1,N,wid,name,cls in L:
    fr=split(A[si][y0:y1,x0:x1],N,minpx=100)
    exec(open('fin.py').read().split('exec(open')[0].split('import pickle')[1].split('\n',1)[1]) if 'clean' not in globals() else None
    fr=[clean(f) for f in fr]
    px=lambda im: int((np.array(im)[:,:,3]>0).sum())
    hands=[f for f in fr if skin(f)>0.05 and px(f)>150]; noh=[f for f in fr if skin(f)<=0.05]
    if not hands: hands=sorted(fr,key=px)[-1:]
    k=max(range(min(3,len(hands))),key=lambda i:px(hands[i])); idle=hands[k]; P=px(idle)
    fire=[f for f in hands[k+1:] if px(f)>0.4*P][:4] or [f for f in hands[:k] if px(f)>0.4*P][:4] or [idle]
    proj=next((f for f in noh if f.width>f.height*1.8),None)
    s=60/idle.height; sv=lambda im,fn: im.resize((max(1,round(im.width*s)),max(1,round(im.height*s))),Image.LANCZOS).save(fn)
    files=[f'x_{wid}_1.png']; sv(idle,'wout/'+files[0])
    for i,f in enumerate(fire): n=f'x_{wid}_{i+2}.png'; sv(f,'wout/'+n); files.append(n)
    pk=idle; ps=24/pk.height; pk.resize((max(1,round(pk.width*ps)),24),Image.LANCZOS).save(f'wout/xp_{wid}.png')
    e={'id':wid,'name':name,'cls':cls,'frames':files,'fire':list(range(1,len(files))) or [0],'pick':f'xp_{wid}.png'}
    if proj is not None: ps2=0.5; proj.resize((max(1,round(proj.width*ps2)),max(1,round(proj.height*ps2))),Image.LANCZOS).save(f'wout/xj_{wid}.png'); e['proj']=f'xj_{wid}.png'
    if cls=='thrown' and 'proj' not in e: e['cls']='melee'
    man.append(e); strips.append([idle]+fire+([proj] if proj is not None else []))
json.dump(man,open('wout/man.json','w'),indent=1)
from PIL import ImageDraw
H=sum(max(i.height for i in r)//2+16 for r in strips); C=Image.new('RGBA',(1500,H),(200,200,205,255)); y=0; d=ImageDraw.Draw(C)
for k,r in enumerate(strips):
    x=150; d.text((2,y+4),man[k]['name'],fill=(0,0,0))
    for i in r: j=i.resize((i.width//2,i.height//2)); C.paste(j,(x,y),j); x+=j.width+6
    y+=max(i.height for i in r)//2+16
C.save('c_wep2.png'); print(len(man),sum(1 for e in man if 'proj' in e))
