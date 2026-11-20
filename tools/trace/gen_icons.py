"""Write registry/designs/<id>/icons.tsx from traced JSON.
usage: gen_icons.py <id> <Title> <ref> <out.json[,extra.json]> <Name,Name,...> [keep-file-snippet]"""
import os, sys, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
did, title, ref, srcs, names = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4].split(','), sys.argv[5].split(',')
extra = open(sys.argv[6]).read() if len(sys.argv) > 6 else ''
icons = []
for src in srcs: icons += json.load(open(src))
multi = any(ic and ic['layers'] and ic['layers'][0]['fill'] for ic in icons)
out = [f'/**\n * Icons for the {title} design, traced from reference image {ref}.\n * Pass them as `tabBarIcon` in your screen options.\n */',
       "import Svg, { Path } from 'react-native-svg';", "import type { TabIconProps } from 'tabcn';", '']
for name, ic in zip(names, icons):
    if not ic or name == '-': continue
    single = not ic['layers'][0]['fill']
    args = '{ color, size }' if single else '{ size }'
    paths = '\n'.join(
        f'      <Path d="{L["d"]}" fill={{color}} />' if not L['fill'] else f'      <Path d="{L["d"]}" fill="{L["fill"]}" />'
        for L in ic['layers'])
    out.append(f'export function {name}({args}: TabIconProps) {{\n  return (\n    <Svg width={{size}} height={{size}} viewBox="0 0 40 40">\n{paths}\n    </Svg>\n  );\n}}\n')
code = '\n'.join(out) + (('\n' + extra) if extra else '')
path = os.path.join(ROOT, 'registry', 'designs', did, 'icons.tsx')
open(path, 'w').write(code)
print(did, len(code) // 1024, 'KB')
