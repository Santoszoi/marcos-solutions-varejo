import {spawnSync} from 'node:child_process';
const r=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{stdio:'inherit',env:{...process.env,VITE_DEMO:'true'},shell:process.platform==='win32'});process.exit(r.status??1);
