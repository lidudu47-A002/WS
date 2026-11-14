// ---------- 渲染系统 ----------
function updateCam() {
    let target = cameraX;
    let psx = player.x - cameraX;
    if (psx < DEAD_ZONE_LEFT) target = player.x - DEAD_ZONE_LEFT;
    else if (psx > DEAD_ZONE_RIGHT) target = player.x - DEAD_ZONE_RIGHT;
    target = Math.min(Math.max(0, target), WORLD_W - VIEW_W);
    cameraX += (target - cameraX)*0.1;
    cameraX = Math.min(Math.max(0, cameraX), WORLD_W - VIEW_W);
}

function draw() {
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,VIEW_W,VIEW_H);
    // 壁灯
    DECOS.forEach(d => {
        let sx = d.x - cameraX; if (sx + d.w < 0 || sx > VIEW_W) return;
        ctx.fillStyle = d.color; ctx.fillRect(sx, d.y, d.w, d.h);
    });
    // 存档点
    savePoints.forEach(sp => {
        let sx = sp.starX - cameraX; if (sx+25 < 0 || sx-25 > VIEW_W) return;
        let sy = WORLD_H - 70, sz = ANIMATION_SIZE/2;
        if (saveStarImage && saveStarImage.complete) {
            ctx.drawImage(saveStarImage, sx-sz, sy-sz, ANIMATION_SIZE, ANIMATION_SIZE);
            ctx.save(); ctx.shadowColor = 'rgba(255,215,0,0.6)'; ctx.shadowBlur=10;
            ctx.drawImage(saveStarImage, sx-sz, sy-sz, ANIMATION_SIZE, ANIMATION_SIZE); ctx.restore();
        } else {
            ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(sx, sy, 16, 0, 2*Math.PI); ctx.fill();
            ctx.fillStyle = '#ffaa33';
            for (let i=0;i<6;i++) { let a = i*Math.PI*2/6; ctx.beginPath(); ctx.arc(sx+Math.cos(a)*24, sy+Math.sin(a)*24, 6, 0, 2*Math.PI); ctx.fill(); }
        }
    });
    // 敌人
    enemies.forEach(e => {
        let sx = e.x - cameraX; if (sx+e.w <0 || sx>VIEW_W) return;
        ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.color;
        ctx.fillRect(sx, e.y, e.w, e.h);
        ctx.fillStyle='#fff'; ctx.font='bold 12px monospace'; ctx.fillText(e.hp, sx+6, e.y-5);
    });
    // 投射物
    projectiles.forEach(b => {
        let sx = b.x - cameraX; if (sx+b.w<0 || sx>VIEW_W) return;
        if (b.isEnemy) { ctx.fillStyle='#fff'; ctx.fillRect(sx, b.y, b.w, b.h); }
        else { ctx.save(); ctx.translate(sx+b.w/2, b.y+b.h/2); ctx.rotate(b.angle); ctx.fillStyle='#b8860b'; ctx.fillRect(-b.w/2, -b.h/2, b.w, b.h); ctx.restore(); }
    });
    if (pierceProjectile) { let sx=pierceProjectile.x-cameraX; ctx.fillStyle='#fff'; ctx.fillRect(sx, pierceProjectile.y, PIERCE_W, PIERCE_H); }
    // 激光
    if (boss) lasers.forEach(l => {
        let sy=0, ey=WORLD_H, sx, ex;
        if (l.angle===0) { sx=l.x; ex=l.x; } else { let e=getSlantLaserEndpoints(l.x,l.angle); sx=e.startX; ex=e.endX; }
        let ssx = sx-cameraX, sex = ex-cameraX;
        ctx.beginPath(); ctx.moveTo(ssx, sy);
        if (l.state==='warn') { ctx.lineTo(sex, ey); ctx.strokeStyle=`rgba(255,0,0,${0.3+Math.sin(l.blink*2*Math.PI)*0.2})`; ctx.lineWidth=20; ctx.stroke(); }
        else if (l.state==='act') { let cy = sy+(ey-sy)*l.factor, cx = sx+(ex-sx)*l.factor; ctx.lineTo(cx-cameraX, cy); ctx.strokeStyle='rgba(255,50,50,0.9)'; ctx.lineWidth=22; ctx.stroke(); }
    });
    // 砖头预览
    if (charging && previewBrick.active) {
        let sx = previewBrick.worldX-cameraX, sy = previewBrick.worldY;
        ctx.save(); ctx.translate(sx+BRICK_W/2, sy+BRICK_H/2); ctx.rotate(previewBrick.angle); ctx.globalAlpha=0.6; ctx.fillStyle='#cd853f'; ctx.fillRect(-BRICK_W/2, -BRICK_H/2, BRICK_W, BRICK_H); ctx.restore();
        let pcx=player.x, pcy=player.y+player.h/2, tx=mouseScreenX+cameraX, ty=mouseScreenY, dx=tx-pcx, dy=ty-pcy, len=Math.hypot(dx,dy);
        if (len>0.001) {
            let nx=dx/len, ny=dy/len, sx2=previewBrick.worldX+BRICK_W/2, sy2=previewBrick.worldY+BRICK_H/2, vx=nx*BRICK_SPD, vy=ny*BRICK_SPD;
            ctx.beginPath(); ctx.strokeStyle='#aaa'; ctx.setLineDash([4,4]); ctx.lineWidth=1.5;
            let x=sx2, y=sy2, vxs=vx, vys=vy; ctx.moveTo(x-cameraX, y);
            for (let t=0.1; t<=2.0; t+=0.1) { vys+=BRICK_GRAV*0.1; x+=vxs*0.1; y+=vys*0.1; ctx.lineTo(x-cameraX, y); }
            ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x-cameraX, y, 3, 0, 2*Math.PI); ctx.fill();
        }
    }
    // BOSS
    if (boss) {
        let sx = boss.x-cameraX; if (sx+boss.w>0 && sx<VIEW_W) {
            let cw=boss.w/4, ch=boss.h/4;
            for (let i=0;i<4;i++) for (let j=0;j<4;j++) { ctx.fillStyle=boss.colors[i*4+j]; ctx.fillRect(sx+j*cw, boss.y+i*ch, cw, ch); }
            ctx.fillStyle='#f00'; ctx.fillRect(sx, boss.y-12, boss.w, 6);
            ctx.fillStyle='#0f0'; ctx.fillRect(sx, boss.y-12, boss.w*(boss.hp/boss.maxHp), 6);
        }
    }
    // 玩家
    let px = player.x-cameraX+player.visualOffX;
    ctx.fillStyle='#fff'; ctx.fillRect(px, player.y, player.w, player.h);
    ctx.fillStyle='#333'; ctx.beginPath(); ctx.roundRect(px+player.w/2-14, player.y-20, 28, 20, 6); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold 18px monospace'; ctx.textAlign='center'; ctx.fillText(player.facing===1?'→':'←', px+player.w/2, player.y-10);
    ctx.fillStyle='#ff0'; ctx.font='bold 12px monospace'; ctx.fillText('⤴'+player.jumpsLeft, px+player.w/2, player.y-23);
    let hpw=200, hph=20, hpp=Math.min(1,Math.max(0,playerHP/PLAYER_MAX_HP));
    ctx.fillStyle='#333'; ctx.fillRect(10,10,hpw,hph); ctx.fillStyle='#f00'; ctx.fillRect(10,10,hpw*hpp,hph);
    ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.strokeRect(10,10,hpw,hph);
    ctx.fillStyle='#fff'; ctx.font='bold 14px monospace'; ctx.fillText(`HP: ${Math.floor(playerHP)}/${PLAYER_MAX_HP}`, 15, 25);
    if (gameOver) { ctx.fillStyle='#fff'; ctx.font='bold 48px monospace'; ctx.fillText('游戏结束', VIEW_W/2, VIEW_H/2); }
}