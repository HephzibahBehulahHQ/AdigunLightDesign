export interface ChannelKeyframe {fixtureId:string;property:string;time:number;value:number;}
export interface CueTarget {fixtureId:string;properties:Record<string,number>;}
export interface Cue {id:string;name:string;duration:number;fade:number;delay?:number;fadeOut?:number;trackId?:string;startTime?:number;targets:CueTarget[];keyframes?:{time:number;value:string}[];channelKeyframes?:ChannelKeyframe[];}
export type CueOptions=Partial<Pick<Cue,"id"|"name"|"duration"|"fade"|"delay"|"fadeOut">>;
