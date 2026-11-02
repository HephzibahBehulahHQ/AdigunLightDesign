export function evaluateEffect(fixtures,{type="pulse",period=2,minimum=0,maximum=255}={},elapsed=0) {
  if (!["pulse","chase","panTilt"].includes(type) || !Number.isFinite(period) || period<=0 || !Number.isFinite(elapsed) || ![minimum,maximum].every(Number.isInteger) || minimum<0 || maximum>255 || minimum>maximum) throw new Error("Invalid virtual effect settings.");
  const phase=((Math.max(0,elapsed)/period)%1);
  const active=Math.floor(phase*fixtures.length);
  return fixtures.map((fixture,index)=>{
    if (type==="panTilt") {
      const properties={...fixture.properties},angle=(phase+index/Math.max(1,fixtures.length))*Math.PI*2;
      for (const [key,amount] of [["pan",(1+Math.sin(angle))/2],["tilt",(1+Math.cos(angle))/2]]) {
        if (Object.hasOwn(properties,key)) properties[key]=Math.round(minimum+(maximum-minimum)*amount);
      }
      return {...fixture,properties};
    }
    const amount=type==="pulse" ? (1-Math.cos(phase*Math.PI*2))/2 : index===active ? 1 : 0;
    return {...fixture,properties:{...fixture.properties,dimmer:Math.round(minimum+(maximum-minimum)*amount)}};
  });
}
