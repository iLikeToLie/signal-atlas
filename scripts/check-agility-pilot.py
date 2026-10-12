"""Real IndexedDB/worker/browser pilot, exclusively in the isolated test database.
Generate controls:pilot first; run Vite dev. --ui-path can select a production build
served by that same dev origin. Requires Python Playwright and Chromium.
"""
import json
import os
import argparse
import hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
base = os.environ.get('ATLAS_TEST_URL', 'http://127.0.0.1:5173')
parser=argparse.ArgumentParser();parser.add_argument('--ui-path',default='/');parser.add_argument('--quick',action='store_true');args=parser.parse_args()
output = Path('artifacts'); output.mkdir(exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--enable-precise-memory-info','--js-flags=--max-old-space-size=3072'])
    page = b.new_page(viewport={'width':1440,'height':1000},timezone_id='Asia/Singapore')
    errors=[]; page.on('pageerror',lambda e: errors.append(str(e)));page.set_default_timeout(120000);page.goto(base+args.ui_path+'?sandbox=pilot')
    manifest=json.loads(Path('artifacts/agility-stage0-pilot/manifest.json').read_text())
    largest=Path('artifacts/agility-stage0-pilot')/(manifest['sources'][0]+'.json')
    assert len(json.loads(largest.read_text())['events'])==100000
    page.get_by_role('button',name='+ Add observation',exact=True).click()
    page.evaluate('window.intakeStarted=performance.now()')
    page.get_by_label('Event data file',exact=True).set_input_files(largest)
    page.wait_for_function("Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Preview before saving'&&!b.disabled)")
    page.evaluate('window.intakeParseStarted=performance.now()')
    page.get_by_role('button',name='Preview before saving',exact=True).click()
    page.get_by_label('Event import preview',exact=True).wait_for()
    assert '100000 events' in page.get_by_label('Event import preview',exact=True).inner_text()
    assert len(page.get_by_label('Event data',exact=True).input_value())<=4000
    intake={'largest_modal_preview_ms':page.evaluate('performance.now()-intakeStarted'),'largest_modal_parse_display_ms':page.evaluate('performance.now()-intakeParseStarted')}
    page.evaluate('window.intakeSaveStarted=performance.now()')
    page.get_by_role('button',name='Save original & full window',exact=True).click()
    page.locator('dialog').wait_for(state='detached')
    intake['largest_modal_save_ms']=page.evaluate('performance.now()-intakeSaveStarted')
    saved=page.evaluate("""async()=>{const {AgilityStore}=await import('/src/agilityStorage.ts');const db=await AgilityStore.open('signal-atlas-agility-pilot-test');const state=await db.load();db.close();return state.sources[0]}""")
    assert saved['count']==100000 and saved['originalSha256']==hashlib.sha256(largest.read_bytes()).hexdigest()
    page.evaluate("""base => {
      window.pilot={status:'loading'};
      const source=`
        import {AgilityStore,AGILITY_DB} from '${base}/src/agilityStorage.ts';
        import {emptyLibrary,addRecording,storeRecording,windowView,uid} from '${base}/src/agilityModel.ts';
        import {validateEventRecording} from '${base}/spec/agility.ts';
        self.onmessage=async()=>{try{
          const started=performance.now(), manifest=await(await fetch('${base}/artifacts/agility-stage0-pilot/manifest.json')).json();
          const db=await AgilityStore.open('signal-atlas-agility-pilot-test'),old=await db.load();let state=emptyLibrary();
          for(let i=0;i<manifest.sources.length;i++){
            const id=manifest.sources[i];let text=await(await fetch('${base}/artifacts/agility-stage0-pilot/'+id+'.json')).text();
            if(i%5===4){const varied=JSON.parse(text);for(const e of varied.events)e.values.pulseWidth=null;text=JSON.stringify(varied);}const r=validateEventRecording(JSON.parse(text)),stored=await storeRecording(r,text,id+'.json');
            const profile=manifest.streams.find(s=>s.id===r.streamId);
            state=addRecording(state,stored,profile);
            const full=state.windows.at(-1);
            for(const w of manifest.windows.filter(w=>w.recordingId===id&&!w.id.endsWith('-full'))){state.windows.push(w);state.views[w.id]=windowView(r,w);}
            const patternId='pilot-pattern-'+i,decisionId='pilot-decision-'+i,evidenceId='pilot-evidence-'+i;
            const scope={windowId:full.id,startEvent:0,endEvent:r.events.length,channelIds:r.channels.map(c=>c.id)};
            state.patterns.push({id:patternId,streamId:r.streamId,name:'Pilot pattern '+i,revision:1,representativeWindowId:full.id,evidenceIds:[evidenceId],variantIds:[],notes:'Controlled capacity construction.'});
            state.evidence.push({id:evidenceId,patternId,patternRevision:1,decisionId,role:'support',scope});
            state.decisions.push({id:decisionId,timestamp:new Date().toISOString(),action:'new-pattern',windowId:full.id,patternId,explanation:'Synthetic capacity seed.',evidence:[scope]});
            state=await db.commit(state,i===0?old.revision:state.revision,[stored]);
            self.postMessage({status:'loading',done:i+1});
          }
          const count=state.sources.reduce((n,s)=>n+s.count,0);db.close();
          self.postMessage({status:'ready',import_ms:performance.now()-started,event_count:count,sources:state.sources.length,profiles:state.streams.length,windows:state.windows.length,patterns:state.patterns.length});
        }catch(e){self.postMessage({status:'error',error:e.message})}};`;
      const url=URL.createObjectURL(new Blob([source],{type:'application/javascript'})),w=new Worker(url,{type:'module'});
      w.onmessage=e=>{window.pilot=e.data;if(e.data.status!=='loading'){w.terminate();URL.revokeObjectURL(url)}};w.postMessage({});
    }""",base)
    page.wait_for_function("pilot.status!=='loading'")
    report=page.evaluate('pilot');report.update(intake);assert report['status']=='ready',report
    assert report['event_count']==1000000 and report['sources']==50 and report['profiles']==50 and report['windows']==500
    page.goto(base+args.ui_path+'?sandbox=pilot')
    page.wait_for_function("document.querySelector('[data-collection-size=\"500\"]')")
    report['scene_windows']=int(page.locator('.observation-map').get_attribute('data-collection-size'));assert report['scene_windows']==500
    report['metadata_open_ms']=page.evaluate('performance.now()')
    page.wait_for_function("!document.querySelector('.observation-map-shell [role=status]').textContent.includes('updating')")
    report['ui_initial_grouping_finished_ms']=page.evaluate('performance.now()')
    # Meter the actual map worker over all windows, independent of DOM culling.
    worker_report=page.evaluate("""async()=>{const {AgilityStore}=await import('/src/agilityStorage.ts'),{matchingView}=await import('/src/agilityMatching.ts');const db=await AgilityStore.open('signal-atlas-agility-pilot-test'),state=await db.load();db.close();const views=Object.fromEntries(Object.values(state.views).map(v=>[v.windowId,matchingView(v)])),identity={workspace:'pilot',revision:state.revision,settingsHash:JSON.stringify(state.settings),inputFingerprint:'pilot'};
      const run=(kind)=>new Promise((resolve,reject)=>{const started=performance.now(),w=new Worker('/src/agilityMap.worker.ts',{type:'module'});let lastProgress=0;w.onmessage=e=>{if(e.data.progress!==undefined){lastProgress=e.data.progress;return;}w.terminate();e.data.error?reject(Error(e.data.error)):resolve({elapsed_ms:performance.now()-started,progress:lastProgress,value:e.data.value});};w.postMessage({id:1,identity,kind,views,settings:state.settings,queryWindowId:state.windows[0].id});});
      const groups=await run('groups'),matches=await run('matches');return {candidate_windows:Object.keys(views).length,eligible_windows:groups.value.pairIds.length,ineligible_windows:Object.keys(groups.value.ineligible).length,groups:groups.value.groups.length,grouping_ms:groups.elapsed_ms,group_pairs_progress:groups.progress,matching_ms:matches.elapsed_ms,match_results:matches.value.length};}""")
    report.update(worker_report);assert report['candidate_windows']==500 and report['match_results']==499
    page.evaluate('window.matchStarted=performance.now()');page.locator('[data-window-id]').first.press('Enter')
    page.wait_for_function("document.querySelector('.suggestions [role=status]')?.textContent.includes('comparable windows')",timeout=120000)
    report['suggestions_visible_ms']=page.evaluate('performance.now()-matchStarted')
    assert '499 comparable windows' in page.locator('.suggestions [role=status]').inner_text()
    report['svg_paths']=page.locator('svg path').count();report['mounted_tiles']=page.locator('[data-window-id]').count()
    page.get_by_role('button',name='Cancel matching',exact=True).click();assert page.locator('.suggestion').count()==0
    page.get_by_role('button',name='Retry analysis',exact=True).click()
    page.get_by_role('button',name='Cancel matching',exact=True).click();page.wait_for_timeout(100)
    assert page.locator('.suggestion').count()==0;report['matching_cancel']='passed'
    latencies=page.evaluate("""async()=>{const values=[];for(let i=0;i<10;i++){let start=performance.now();document.querySelectorAll('.view-switch button')[i%2].click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));values.push(performance.now()-start)}return values}""")
    report['desktop_interaction_ms']=latencies;report['desktop_upper_observed_ms']=max(latencies)
    page.get_by_role('button',name='Similarity',exact=True).click()
    page.get_by_role('button',name='Close observation inspector',exact=True).click()
    page.set_viewport_size({'width':390,'height':844});session=page.context.new_cdp_session(page);session.send('Emulation.setCPUThrottlingRate',{'rate':4})
    mobile=page.evaluate("""async()=>{const values=[];for(let i=0;i<6;i++){let start=performance.now();document.querySelectorAll('.view-switch button')[i%2].click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));values.push(performance.now()-start)}return values}""")
    report['constrained_interaction_ms']=mobile;report['constrained_upper_observed_ms']=max(mobile)
    report['environment']=page.evaluate("""async()=>({platform:navigator.platform,logical_processors:navigator.hardwareConcurrency,device_memory_gb:navigator.deviceMemory,cpu_throttle:4,constrained_viewport:'390x844',js_heap_bytes:performance.memory?.usedJSHeapSize,storage:await navigator.storage.estimate(),memory_scope:'main page only; worker heaps not reported'})""")
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    session.send('Emulation.setCPUThrottlingRate',{'rate':1});page.get_by_role('button',name='Similarity',exact=True).click()
    page.screenshot(path=str(output/'agility-pilot-mobile.png'),full_page=True)
    integrity={} if args.quick else page.evaluate("""async()=>{const started=performance.now(),w=new Worker('/src/agility.worker.ts',{type:'module'});const file=await new Promise((resolve,reject)=>{w.onmessage=e=>{w.terminate();e.data.error?reject(new Error(e.data.error)):resolve(e.data.value)};w.postMessage({id:1,kind:'backup',dbName:'signal-atlas-agility-pilot-test'})});
      const size=file.size,backupMs=performance.now()-started;const v=new Worker('/src/agility.worker.ts',{type:'module'});
      const validated=await new Promise((resolve,reject)=>{v.onmessage=e=>{v.terminate();e.data.error?reject(new Error(e.data.error)):resolve(e.data.value)};v.postMessage({id:2,kind:'restore',file})});
      const a=new Worker('/src/agility.worker.ts',{type:'module'});const restored=await new Promise((resolve,reject)=>{a.onmessage=e=>{a.terminate();e.data.error?reject(new Error(e.data.error)):resolve(e.data.value)};a.postMessage({id:3,kind:'restore-apply',file,dbName:'signal-atlas-agility-pilot-test',mode:'replace',expectedRevision:validated.state.revision})});
      return {backup_bytes:size,backup_ms:backupMs,backup_validate_restore_ms:performance.now()-started,event_count:restored.sources.reduce((n,s)=>n+s.count,0),windows:restored.windows.length,identities_preserved:JSON.stringify(restored.patterns)===JSON.stringify(validated.state.patterns),views_preserved:JSON.stringify(restored.views)===JSON.stringify(validated.state.views)}}""")
    report['round_trip']=integrity
    if not args.quick:assert integrity['event_count']==1000000 and integrity['windows']==500 and integrity['identities_preserved'] and integrity['views_preserved']
    report['browser']=b.version;report['runtime_errors']=errors;assert not errors,errors
    report['ui_path']=args.ui_path
    report['interaction_budget_passed']=max(latencies)<100 and max(mobile)<200
    (output/('agility-pilot-quick.json' if args.quick else 'agility-pilot-results.json')).write_text(json.dumps(report,indent=2));print(json.dumps(report));b.close()
