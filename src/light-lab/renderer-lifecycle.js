export function lightLabRendererConfig(scene, quality, projection) {
  return JSON.stringify({room:scene.room,materials:scene.materials,stage:scene.stage,visibility:scene.visibility,quality,projection});
}

export function lightLabFixtureState(fixtures) {
  return JSON.stringify(fixtures);
}

export function shouldReuseLightLabRenderer({renderer,canvas,view,previousConf