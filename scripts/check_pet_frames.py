"""Validate real 24fps frames, stationary body regions, and atlas completeness."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    """Fail if timing, unique rendered phases or torso anchors regress."""
    try:
        destination = ROOT / 'src/assets/pet-templates'
        layout = json.loads((destination / 'default-pet-atlas.json').read_text(encoding='utf-8'))
        report = {}
        with Image.open(destination / 'default-pet-atlas.webp') as atlas:
            for name, animation in layout['animations'].items():
                if name.startswith('rest-'):
                    continue
                count = len(animation['frames'])
                if abs(count / animation['durationMs'] * 1000 - 24) > 0.0001:
                    raise ValueError(f'Incorrect FPS: {name}')
                hashes, anchors = set(), set()
                for frame in animation['frames']:
                    column, row = frame % layout['columns'], frame // layout['columns']
                    cell_size = layout['cell_size']
                    cell = atlas.crop((column * cell_size, row * cell_size, (column + 1) * cell_size, (row + 1) * cell_size))
                    hashes.add(hashlib.sha256(cell.tobytes()).hexdigest())
                    # Central waistband is outside all moving limb regions.
                    anchors.add(hashlib.sha256(cell.crop((240, 372, 272, 388)).tobytes()).hexdigest())
                    alpha = np.asarray(cell.getchannel('A'))
                    if np.any(alpha[[0, -1], :]) or np.any(alpha[:, [0, -1]]):
                        raise ValueError(f'Clipped frame: {name}/{frame}')
                if len(hashes) != count or len(anchors) != 1:
                    raise ValueError(f'Duplicated frames or shifting waistband: {name}/{len(hashes)}/{len(anchors)}')
                report[name] = {'frames': count, 'unique': len(hashes), 'fps': 24, 'waist_stable': True}
        (ROOT / 'docs/pet-assets/24fps-validation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps({'success': True, 'animations': report}))
    except (OSError, ValueError) as error:
        print(json.dumps({'success': False, 'error': str(error)}))
        raise SystemExit(1) from error


if __name__ == '__main__':
    main()
