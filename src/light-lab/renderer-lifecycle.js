export function lightLabRendererConfig(scene, quality, projection) {
  return JSON.stringify({room:scene.room,roomType:scene.roomType,ambience:scene.ambience,materials:scene.materials,stage:scene.stage,visibility:scene.visibility,quality,projection});
}

export function lightLabFixtureState(fixtures) {
  return JSON.stringify(fixtures);
}

export function shouldReuseLightLabRenderer({renderer,canvas,view,previousConfig,nextConfig}) {
  return Boolean(renderer && canvas && view==="light" && previousConfig && previousConfig===nextConfig);
}
