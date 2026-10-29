/** Extract only provider-reported accounting; never infer zero or price. */
export function reportedUsage(text,contentType='application/json'){
 let frames;try{frames=contentType.includes('text/event-stream')?text.split(/\r?\n/).filter(line=>line.startsWith('data: {')).map(line=>JSON.parse(line.slice(6))):[JSON.parse(text)];}catch{return {usage:null,cost:null};}
 const frame=frames.findLast(value=>value?.usage);const usage=frame?.usage;
 if(!usage||!Number.isSafeInteger(usage.prompt_tokens)||usage.prompt_tokens<0||!Number.isSafeInteger(usage.completion_tokens)||usage.completion_tokens<0)return {usage:null,cost:null};
 return {usage:{inputTokens:usage.prompt_tokens,outputTokens:usage.completion_tokens},cost:null};
}
