document.querySelector('#guide-search')?.addEventListener('input', event => {
  const query=event.target.value.toLowerCase().trim();
  for(const link of document.querySelectorAll('[data-guide]'))link.hidden=!link.textContent.toLowerCase().includes(query);
});
for(const button of document.querySelectorAll('[data-copy]'))button.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(button.parentElement.querySelector('code').textContent);button.textContent='Copied';}
  catch{button.textContent='Select code to copy';}
});
