from io import BytesIO
from PIL import Image
import numpy as np

PATTERNS = ["clear","developing","curved_band","central_dense_overcast","eye","sheared","dissipating"]

def image_stats(data: bytes):
    img = Image.open(BytesIO(data)).convert("RGB").resize((128,128))
    a = np.asarray(img,dtype=np.float32)/255.0
    g = a.mean(axis=2)
    return float(g.mean()), float(g.std()), float(np.abs(np.diff(g,axis=0)).mean()+np.abs(np.diff(g,axis=1)).mean()), float(g[40:88,40:88].mean())

def classify_demo(data: bytes):
    mean,std,edge,center = image_stats(data)
    if std < .10 and mean > .55: return "central_dense_overcast", .63
    if edge > .055: return "curved_band", .59
    if center < mean-.04 and mean > .35: return "eye", .61
    if mean < .22: return "dissipating", .58
    if std > .20: return "sheared", .57
    return "developing", .55

def forecast(obs):
    a,b=obs[-2],obs[-1]
    next_lat=b.lat+(b.lat-a.lat)
    next_lon=b.lon+(b.lon-a.lon)
    wind=max(0.0,b.wind_kts+(b.wind_kts-a.wind_kts))
    if wind < 34: cls="depression"
    elif wind < 64: cls="tropical_storm"
    elif wind < 83: cls="severe_cyclonic_storm"
    else: cls="very_severe_cyclonic_storm"
    return next_lat,next_lon,wind,cls,min(.95,.55+min(len(obs),10)*.03)
