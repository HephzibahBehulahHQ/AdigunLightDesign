export function roomDimensions(room={width:10,height:4,depth:8}) {
  if (!room || typeof room!=="object" || Array.isArray(room)) throw new Error("Invalid room dimensions.");
  const {width,height,depth}=room;
  if (![width,height,depth].every(Number.isFinite) || width<2 || width>50 || depth<2 || depth>50 || height<2 || height>20) throw new Error("Room dimensions require width/depth 2–50 m and height 2–20 m.");
  return {width,height,depth};
}
