import fs from 'fs/promises';
import path from 'path';

const repoRoot = process.cwd();
const exts = ['.js','.ts','.html','.md','.json','.env','.example'];
const jwtRegex = /eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g;

async function walk(dir){
  const entries = await fs.readdir(dir,{withFileTypes:true});
  for(const e of entries){
    const full = path.join(dir,e.name);
    if(e.isDirectory()){
      if(full.includes('.git')) continue;
      await walk(full);
    } else {
      const ext = path.extname(e.name).toLowerCase();
      if(exts.includes(ext) || e.name.endsWith('.example')){
        let content = await fs.readFile(full,'utf8');
        const newContent = content.replace(jwtRegex,'[JWT_REMOVIDO]');
        if(newContent !== content){
          await fs.writeFile(full,newContent,'utf8');
          console.log('Redacted:', full);
        }
      }
    }
  }
}

walk(repoRoot).catch(err=>{ console.error(err); process.exit(1); });
