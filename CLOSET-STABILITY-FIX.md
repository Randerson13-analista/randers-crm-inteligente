# Correção de estabilidade do Closet

- Somente o avatar principal usa um contexto WebGL.
- Miniaturas usam previews leves sem criar dezenas de renderizadores.
- O canvas 3D agora fica em um elemento separado dos overlays do React.
- Falhas do Three.js ficam isoladas por uma Error Boundary.
- WebGL indisponível, contexto perdido, URL GLB inválida e timeout têm fallback visível.
- Recursos de GPU, materiais e texturas são liberados ao sair do módulo.
- Cache do Service Worker atualizado para `randerscrm-v8-closet-stable`.
