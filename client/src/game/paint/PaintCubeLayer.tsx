import type { PaintCube } from '../../../shared/types/paint';
import DraggablePaintCube from './DraggablePaintCube';
import './PaintCubeLayer.css';

interface PaintCubeLayerProps {
  cubes: PaintCube[];
}

const PaintCubeLayer = ({ cubes }: PaintCubeLayerProps) => (
  <div className="paint-cube-layer">
    <p className="paint-cube-layer__label">Studio cubes</p>
    {cubes.length === 0 ? (
      <p className="paint-cube-layer__empty">No paint cubes available yet</p>
    ) : (
      <div className="paint-cube-layer__grid">
        {cubes.map((cube) => (
          <DraggablePaintCube key={cube.id} cube={cube} />
        ))}
      </div>
    )}
  </div>
);

export default PaintCubeLayer;
