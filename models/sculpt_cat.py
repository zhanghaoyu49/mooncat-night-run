"""Build the original short-haired cat surface and skin weights in Blender background mode.
Run from the game directory with blender -b -P models/sculpt_cat.py.
Coordinates use the game's X-forward, Y-down, Z-near convention.
"""
import bpy, math, struct, base64, json
from mathutils import Vector, Matrix, kdtree
from pathlib import Path
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
samples=[]
bones=[]
def joint(a,b):
    bones.append([list(a),list(b)])
    return len(bones)-1
def skin_part(b):
    ob=bpy.context.object
    samples.extend((ob.matrix_world@v.co,b) for v in ob.data.vertices)
def oval(b,c,r,tilt=0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=28,ring_count=18)
    o=bpy.context.object
    o.matrix_world=Matrix.Translation(c)@Matrix.Rotation(tilt,4,'Z')@Matrix.Diagonal((*r,1))
    skin_part(b)
def tube(b,a,c,ra,rc,side=1):
    a,c=Vector(a),Vector(c);axis=(c-a).normalized()
    across=axis.cross(Vector((0,0,1))).normalized();lat=axis.cross(across)
    vs=[];faces=[];n=18
    for j in range(6):
        t=j/5;r=ra*(1-t)+rc*t
        for i in range(n):
            angle=math.tau*i/n
            vs.append(a.lerp(c,t)+r*(across*math.cos(angle)+lat*math.sin(angle)*side))
            if j:faces.append(((j-1)*n+i,(j-1)*n+(i+1)%n,j*n+(i+1)%n,j*n+i))
    faces.extend([tuple(range(n-1,-1,-1)),tuple(range(5*n,6*n))])
    mesh=bpy.data.meshes.new('anatomy');mesh.from_pydata(vs,[],faces);mesh.update()
    o=bpy.data.objects.new('anatomy',mesh);bpy.context.collection.objects.link(o)
    samples.extend((Vector(v),b) for v in vs)
joint((-6,-10,0),(-1,-10.7,0));joint((-1,-10.7,0),(4.4,-11,0))
joint((4.4,-11,0),(7.5,-14.2,0));joint((7.5,-14.2,0),(11,-14.2,0))
# A lean waist sits between the pelvic girdle and deep ribcage. The ventral
# profile rises at the abdomen and drops between the forelegs.
oval(0,(-6,-9.65,0),(4.8,3.75,3.21),-.09)
oval(0,(-2.5,-10.25,0),(5.6,3.1,2.77))
oval(1,(1.55,-10.15,0),(5.85,3.9,3.07),.06)
oval(1,(4.1,-9.9,0),(2.85,3.65,2.78),-.15)
oval(2,(5.7,-12.05,0),(4.6,2.65,2.54),-.59)
oval(3,(8.42,-14.46,0),(3.38,2.89,2.94),-.02)
oval(3,(9.4,-13.18,0),(2.45,1.5,2.05))
oval(3,(10.53,-14.28,0),(2.05,1.22,1.48),.12)
oval(3,(10.82,-12.85,0),(1.53,.77,1.23))
for s in [-1,1]:
    oval(3,(8.65,-13.6,s*1.87),(2.06,1.63,1.07),-.04)
    oval(3,(11.25,-13.57,s*.75),(1.42,.89,.91))
    # Pinnae are thick at the roots, thin and slightly backswept at the tips.
    points=[(6.9,-15.55,s*1.2),(9.64,-16.1,s*1.12),(8.8,-15.65,s*2.86),(6.6,-15.6,s*2.8),(7.06,-20.36,s*2.93)]
    mesh=bpy.data.meshes.new('pinna');mesh.from_pydata(points,[],[(0,1,2,3),(0,4,1),(1,4,2),(2,4,3),(3,4,0)]);mesh.update()
    ear=bpy.data.objects.new('pinna',mesh);bpy.context.collection.objects.link(ear)
    samples.extend((Vector(v),3) for v in points)
for z in [-2.05,2.05]:
    for hind in [True,False]:
        x=-6.1 if hind else 4.15
        hip=(x,-9.35,z);knee=(x+(2.35 if hind else -.71),-6.05,z)
        hock=(x+(-1.52 if hind else -.30),-2.78,z)
        foot=(x+(-.77 if hind else -.13),-.96,z);toe=(foot[0]+1.72,-.68,z)
        ids=[joint(a,b) for a,b in zip([hip,knee,hock,foot],[knee,hock,foot,toe])]
        oval(ids[0],(x,-8.5,z),(2.63 if hind else 1.72,3.75,1.38),-.15 if hind else .1)
        for b,a,c,ra,rc in zip(ids,[hip,knee,hock],[knee,hock,foot],[1.61 if hind else 1.2,1.15,.7],[1.16,.69,.63]):
            tube(b,a,c,ra,rc,.87);oval(b,c,(rc,rc,rc*.87))
        oval(ids[3],(foot[0]+.53,-.75,z),(1.42,.75,.94))
        for n in [-1,0,1]:
            oval(ids[3],(toe[0]-.23*abs(n),-.51,z+n*.43),(.62,.47,.40))
a=(-9.25,-10.25,0)
for j in range(8):
    c=(a[0]-1.95,a[1]-.38-j*.062,.17*math.sin(j*.4))
    b=joint(a,c);r=1.04-j*.072
    tube(b,a,c,r,r-.065);oval(b,c,(r-.055,)*3);a=c
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active=bpy.context.selected_objects[0]
bpy.ops.object.join();cat=bpy.context.object
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
cat.data.remesh_voxel_size=.19
bpy.ops.object.voxel_remesh()
sm=cat.modifiers.new('Soft coat silhouette','SMOOTH');sm.factor=.66;sm.iterations=5
bpy.ops.object.modifier_apply(modifier=sm.name)
dec=cat.modifiers.new('Mobile topology','DECIMATE');dec.ratio=.34
bpy.ops.object.modifier_apply(modifier=dec.name)
m=cat.data;m.calc_loop_triangles()
tree=kdtree.KDTree(len(samples))
for i,(p,b) in enumerate(samples):tree.insert(p,i)
tree.balance(); weights=[]
for v in m.vertices:
    ws={}
    for co,i,d in tree.find_n(v.co,12):
        b=samples[i][1];ws[b]=ws.get(b,0)+1/(.1+d*d)**1.65
    total=sum(ws.values());weights.append({b:w/total for b,w in ws.items()})
adj=[[] for v in m.vertices]
for e in m.edges:
    a,b=e.vertices;adj[a].append(b);adj[b].append(a)
for it in range(6):
    out=[]
    for i,w in enumerate(weights):
        d={b:v*.38 for b,v in w.items()}
        for j in adj[i]:
            for b,v in weights[j].items():d[b]=d.get(b,0)+.62*v/len(adj[i])
        out.append(d)
    weights=out
packed=bytearray()
for v,ws in zip(m.vertices,weights):
    sel=sorted(ws,key=ws.get,reverse=True)[:4];total=sum(ws[j] for j in sel)
    mass=[round(255*ws[j]/total) for j in sel];mass[0]+=255-sum(mass)
    packed+=struct.pack('<3h3b4B4B',*(round(q*256) for q in v.co),*(round(q*127) for q in v.normal),*(sel+[0]*4)[:4],*(mass+[0]*4)[:4])
indices=struct.pack('<'+'H'*(3*len(m.loop_triangles)),*[n for tri in m.loop_triangles for n in tri.vertices])
enc=lambda data:base64.b64encode(data).decode()
# A lower-detail surface shares the same skeleton for the software renderer.
tree=kdtree.KDTree(len(m.vertices))
for v in m.vertices:tree.insert(v.co,v.index)
tree.balance()
dec=cat.modifiers.new('Software topology','DECIMATE');dec.ratio=.047
bpy.ops.object.modifier_apply(modifier=dec.name)
low=cat.data;low.calc_loop_triangles();lod=bytearray()
for v in low.vertices:
    _,idx,_=tree.find(v.co)
    lod+=struct.pack('<3h3b',*(round(q*256) for q in v.co),*(round(q*127) for q in v.normal))+packed[idx*17+9:idx*17+17]
lowidx=struct.pack('<'+'H'*(3*len(low.loop_triangles)),*[n for tri in low.loop_triangles for n in tri.vertices])
asset=dict(bones=bones,vertices=enc(packed),indices=enc(indices),lowVertices=enc(lod),lowIndices=enc(lowidx))
Path('tabby-mesh.js').write_text('const tabbyAsset='+json.dumps(asset,separators=(',',':'))+';\n')
print('Cat mesh:',len(packed)//17,'vertices,',len(indices)//6,'triangles; software:',len(lowidx)//6)
