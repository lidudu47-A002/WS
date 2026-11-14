function updatePreview() {
    let pcx = player.x, pcy = player.y+player.h/2, tw = mouseScreenX+cameraX, th = mouseScreenY, dx = tw-pcx, dy = th-pcy, len = Math.hypot(dx,dy);
    if (len>0.001) { let nx=dx/len, ny=dy/len; previewBrick.worldX = pcx - nx*BRICK_BACK; previewBrick.worldY = pcy - ny*BRICK_BACK; previewBrick.angle = Math.atan2(dy,dx); previewBrick.active = true; }
    else previewBrick.active = false;
}
canvas.addEventListener('mousemove', e => {
    let r = canvas.getBoundingClientRect(), sx = canvas.width/r.width, sy = canvas.height/r.height;
    mouseScreenX = Math.min(Math.max(0, (e.clientX-r.left)*sx), VIEW_W);
    mouseScreenY = Math.min(Math.max(0, (e.clientY-r.top)*sy), VIEW_H);
    if (charging) updatePreview();
});
canvas.addEventListener('mousedown', e => {
    if (victory||gameOver) return;
    if (e.button===0) { e.preventDefault(); if (!player.attacking) { player.attacking=true; player.attackStart=performance.now(); performAttack(); } }
    else if (e.button===2) { e.preventDefault(); charging=true; updatePreview(); }
});
canvas.addEventListener('mouseup', e => {
    if (victory||gameOver) return;
    if (e.button===2 && charging) {
        e.preventDefault(); let now=performance.now(); if (now-lastBrick<BRICK_CD) { charging=false; return; } lastBrick=now;
        let pcx=player.x, pcy=player.y+player.h/2, tw=mouseScreenX+cameraX, th=mouseScreenY, dx=tw-pcx, dy=th-pcy, len=Math.hypot(dx,dy);
        if (len>0.001) { let nx=dx/len, ny=dy/len; projectiles.push({ x:previewBrick.worldX, y:previewBrick.worldY, vx:nx*BRICK_SPD, vy:ny*BRICK_SPD, angle:previewBrick.angle, w:BRICK_W, h:BRICK_H, damage:getBrickDamage(), isEnemy:false }); }
        charging=false;
    }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('mouseleave', () => charging=false);

window.addEventListener('keydown', e => {
    if (victory||gameOver) return;
    let c = e.code;
    if (c==='KeyF') { e.preventDefault(); if (!panelVisible) { panelVisible=true; statusPanel.style.display='block'; updatePanelUI(); } return; }
    if (c==='KeyH') { e.preventDefault(); shopPanel.style.display = shopPanel.style.display==='flex' ? 'none' : 'flex'; return; }
    if (c==='KeyS') { e.preventDefault(); exportSave(); return; }
    if (c==='KeyL') { e.preventDefault(); triggerLoad(); return; }
    if (c==='KeyA'||c==='ArrowLeft') { left=true; e.preventDefault(); }
    else if (c==='KeyD'||c==='ArrowRight') { right=true; e.preventDefault(); }
    else if (c==='Space'||c==='ArrowUp') { if (!jumpUsed) { let g = player.y >= getGroundY()-0.001; if (g||player.jumpsLeft>0) { player.vy=JUMP_POWER; jumpUsed=true; player.jumpsLeft = g ? 1 : player.jumpsLeft-1; } } e.preventDefault(); }
    else if (c==='ShiftLeft'||c==='ShiftRight') { shiftDown=true; e.preventDefault(); }
    else if (c==='ArrowDown') { arrowDown=true; e.preventDefault(); }
    else if (c==='KeyC') { e.preventDefault(); let now=performance.now(); if (now-lastPierce>=PIERCE_CD && !pierceCharge && !pierceProjectile) { pierceCharge=true; pierceStart=now; } }
});
window.addEventListener('keyup', e => {
    let c = e.code;
    if (c==='KeyF') { e.preventDefault(); if (panelVisible) { panelVisible=false; statusPanel.style.display='none'; } return; }
    if (c==='KeyA'||c==='ArrowLeft') { left=false; e.preventDefault(); }
    else if (c==='KeyD'||c==='ArrowRight') { right=false; e.preventDefault(); }
    else if (c==='Space'||c==='ArrowUp') { jumpUsed=false; e.preventDefault(); }
    else if (c==='ShiftLeft'||c==='ShiftRight') { shiftDown=false; e.preventDefault(); }
    else if (c==='ArrowDown') { arrowDown=false; e.preventDefault(); }
    else if (c==='KeyC') { if (pierceCharge) pierceCharge=false; e.preventDefault(); }
});
function onBlur() { left=right=shiftDown=arrowDown=jumpUsed=charging=false; if (panelVisible) { panelVisible=false; statusPanel.style.display='none'; } shopPanel.style.display='none'; confirmModal.style.display='none'; }
window.addEventListener('blur', onBlur);
document.addEventListener('visibilitychange', () => { if (document.hidden) onBlur(); });

// 商店逻辑
let pendingItem = null;
document.getElementById('closeShopBtn').onclick = () => shopPanel.style.display = 'none';
document.querySelectorAll('.shop-item-card').forEach(c => c.onclick = e => {
    e.stopPropagation(); pendingItem = c.dataset.item;
    let icon='', name='';
    if (pendingItem==='hp') { icon='素材/商店/HP药水.png'; name='HP药水'; }
    else if (pendingItem==='normalAtk') { icon='素材/商店/normal attack药水.png'; name='普攻药水'; }
    else { icon='素材/商店/skill药水.png'; name='技能药水'; }
    document.getElementById('confirmIcon').innerHTML = `<img src="${icon}" alt="${name}">`;
    document.getElementById('confirmText').innerText = `购买 ${name}？`;
    confirmModal.style.display = 'flex';
});
document.getElementById('confirmBuy').onclick = () => {
    if (!pendingItem) return; let ok=false;
    if (pendingItem==='hp') { if (gold>=30 && playerHP<PLAYER_MAX_HP) { gold-=30; playerHP=Math.min(PLAYER_MAX_HP, playerHP+20); ok=true; } else alert('金币不足或生命已满'); }
    else if (pendingItem==='normalAtk') { if (gold>=100) { gold-=100; normalAttackMult*=1.2; ok=true; } else alert('金币不足'); }
    else if (pendingItem==='skill') { if (gold>=50) { gold-=50; skillDamageMult*=1.2; ok=true; } else alert('金币不足'); }
    if (ok && panelVisible) updatePanelUI();
    confirmModal.style.display='none'; pendingItem=null;
};
document.getElementById('confirmCancel').onclick = () => { confirmModal.style.display='none'; pendingItem=null; };