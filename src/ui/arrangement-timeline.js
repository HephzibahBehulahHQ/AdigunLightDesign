import {arrangeTracks,arrangementDuration} from "../timeline/tracks.js";
import {escapeHtml as esc} from "./html.js";

export function arrangementTimelineMarkup(cues,selectedId,emptyLabel){
  const tracks=arrangeTracks(cues),span=Math.max(30,arrangementDuration(cues));
  const ruler=`<div class="timeline-ruler">${Array.from({length:7},(_,index)=>`<span style="left:${index/6*100}%">${Number((index*span/6).toFixed(1))}s</span>`).join("")}</div>`;
  return `<div class="cue-track arrangement-timeline"><div class="timeline-scale">${ruler}${tracks.map((track,index)=>`<section class="scheduled-track" style="--track-index:${index%3}"><div class="track-name" title="${esc(track.id)}">${esc(track.id)}</div><div class="timeline-lane">${track.entries.map(({cue,start})=>`<button type="button" class="cue-block" data-cue="${esc(cue.id)}" aria-pressed="${cue.id===selectedId}" title="${esc(cue.name)} · ${start}s / ${cue.duration}s" style="left:${start/span*100}%;width:${cue.duration/span*100}%">${esc(cue.name)}</button>`).join("")}</div></section>`).join("") || `<small class="empty-cues">${esc(emptyLabel)}</small>`}<div class="arrangement-playhead-rail" aria-hidden="true"><div id="arrangement-playhead" class="timeline-playhead"></div></div></div></div>`;
}
