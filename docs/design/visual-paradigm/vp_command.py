"""Run installed VP CLI with Unicode-safe Java arguments. No GUI automation."""
from pathlib import Path
import subprocess, json, sys, re
VP=Path('C:/Program Files/Visual Paradigm 15.2')
ROOT=Path(__file__).resolve().parents[3]
def execute_js(src,log=None):
    cmd=[str(VP/'jre/bin/java.exe'),'--add-modules=ALL-SYSTEM','-Djava.awt.headless=true','-Dfile.encoding=UTF-8','-cp',str(VP/'lib/*')+';'+str(VP/'bin')+';'+str(VP/'ormlib/*'),'-m','jdk.scripting.nashorn.shell/jdk.nashorn.tools.jjs.Main']
    p=subprocess.run(cmd,input=src,cwd=VP/'bin',capture_output=True,encoding='utf8',errors='replace',timeout=240)
    output=p.stdout+'\n'+p.stderr
    output=re.sub(r'(?im)^.*getVerifiedLicenseKey:.*$', '[License check output redacted]',output)
    if log: Path(log).write_text(output,encoding='utf8')
    print(output)
    return p.returncode
def command(name,args,log=None):
    assert name in ['ImportXML','ExportXML','ExportDiagramImage','Plugin']
    src='Java.type("com.vp.cmd.'+name+'").main(Java.to('+json.dumps(args,ensure_ascii=True)+',"java.lang.String[]"));\nJava.type("java.lang.System").exit(0);\n'
    return execute_js(src,log)
if __name__=='__main__':
    raise SystemExit(command(sys.argv[1],sys.argv[2:]))
