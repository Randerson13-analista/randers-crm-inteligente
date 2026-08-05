# Closet Premium 3D — fechamento técnico

Esta versão consolida o Avatar Studio com:

- renderização Three.js com tone mapping ACES e iluminação PBR;
- suporte a GLB/GLTF, materiais, texturas, skeleton/skin e animações;
- rotação, zoom, sombras e palco neon;
- timeout e fallback 3D interno para evitar tela travada;
- pausa de renderização fora da tela para reduzir consumo de GPU;
- descarte de geometrias, materiais, ambiente e WebGL no unmount;
- estados de carregamento e aviso de fallback;
- persistência da configuração do avatar no Supabase;
- cache do Service Worker versionado.

## Limite artístico

O motor está pronto para visual quase fotorrealista, mas a aparência final depende dos arquivos GLB/GLTF. Modelos premium precisam ter licença válida, texturas PBR, rig e roupas modulares. O código não transforma automaticamente um modelo simples em um humano live action.
