import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Rigid parts sharing a material become one draw call; articulated joints stay independent. */
export function batchRigid(group: THREE.Object3D, exclude = new Set<THREE.Object3D>()) {
  const materials = new Map<THREE.Material, THREE.Mesh[]>();
  for (const object of group.children) {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh || Array.isArray(mesh.material) || exclude.has(mesh)) continue;
    const list = materials.get(mesh.material) ?? []; list.push(mesh); materials.set(mesh.material, list);
  }
  for (const [material, meshes] of materials) {
    if (meshes.length < 2) continue;
    const parts = meshes.map(mesh => {
      mesh.updateMatrix();
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      return geometry.applyMatrix4(mesh.matrix);
    });
    const geometry = mergeGeometries(parts, false); parts.forEach(part => part.dispose());
    if (!geometry) continue;
    const merged = new THREE.Mesh(geometry, material);
    merged.castShadow = meshes.some(mesh => mesh.castShadow); merged.receiveShadow = meshes.some(mesh => mesh.receiveShadow);
    meshes.forEach(mesh => group.remove(mesh)); group.add(merged);
  }
}
