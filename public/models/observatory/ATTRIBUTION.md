# Observatory curator

The walking character uses **Xbot**, a Mixamo model with idle and walk animations,
distributed with the official Three.js skeletal-animation example.

Source: https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Xbot.glb
Example credit: https://threejs.org/examples/webgl_animation_skinning_additive_blending.html
Mixamo usage information: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html

Adobe permits royalty-free use of Mixamo characters and animations in personal
and commercial projects. This model is used as an integrated character in the
interactive gallery, not offered as a standalone asset download or asset pack.

The original Xbot surfaces are hidden. The visible astronaut consists of custom
procedural spacesuit geometry, woven textile and badge textures, helmet, visor,
gloves, boots and life-support equipment attached to the original animation rig.
The skeleton and idle/walk animations remain Mixamo's work and are credited in
the collection index. A procedural astronaut rig provides an offline fallback.

curator-motion-v1.glb is the runtime derivative: only the skeleton and the idle/walk channels used by the suit are retained. Unused body meshes and other animation clips are removed.

- ship.glb: 'Spaceship' by Quaternius, CC0 1.0 (public domain), https://poly.pizza/m/Jqfed124pQ. Materials are replaced at runtime.
