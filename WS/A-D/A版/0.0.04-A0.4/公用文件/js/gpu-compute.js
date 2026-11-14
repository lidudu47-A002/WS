// ---------- GPU 计算管理 ----------
class GPUCompute {
    constructor() {
        this.gl = null;
        this.program = null;
        this.buffer = null;
        this.outputBuffer = null;
        this.initialized = false;
        this.enemyData = null;
        this.enemyCount = 0;
        this.maxEnemies = 256; // 最大敌人数量
        
        // 状态伤害常量（GPU 常量）
        this.constants = {
            BURN_DAMAGE_BASE: 4,
            BURN_DAMAGE_PER_LEVEL: 2,
            BURN_INTERVAL: 1.0,
            LIGHTNING_DAMAGE_BASE: 5,
            LIGHTNING_DAMAGE_PER_LEVEL: 5,
            LIGHTNING_INTERVAL_BASE: 2.0,
            BLACKHOLE_DAMAGE_BASE: 1,
            BLACKHOLE_DAMAGE_PER_LEVEL: 1,
            WEAK_SPEED_REDUCTION: 0.1,
            WEAK_DAMAGE_REDUCTION: 0.2,
            CHARM_ATTACK_SPEED_MIN: 0.7,
            CHARM_ATTACK_SPEED_MAX: 0.9,
            FREEZE_DURATION: 2.0,
            SLOW_DECAY_INTERVAL: 3.0,
            SLOW_BASE: 0.15,
            SLOW_PER_LEVEL: 0.05,
            LIGHTNING_DECAY_INTERVAL: 8.0,
            BLACKHOLE_ATTRACT_STRENGTH: 0.4,
        };
    }

    init() {
        if (this.initialized) return;
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        this.gl = canvas.getContext('webgl2');
        if (!this.gl) {
            console.warn('WebGL2 not supported, falling back to CPU');
            this.initialized = false;
            return;
        }
        this.initShaders();
        this.initBuffers();
        this.initialized = true;
    }

    initShaders() {
        const gl = this.gl;
        // 顶点着色器：简单全屏四边形
        const vsSource = `#version 300 es
            in vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        // 片段着色器：计算状态更新（核心计算）
        const fsSource = `#version 300 es
            precision highp float;
            
            // 输入数据缓冲区（纹理）
            uniform sampler2D u_enemyData;
            uniform vec2 u_dataSize;
            uniform float u_deltaTime;
            uniform float u_playerLevel;
            uniform float u_globalTime;
            
            // 常量
            const float BURN_DAMAGE_BASE = 4.0;
            const float BURN_DAMAGE_PER_LEVEL = 2.0;
            const float BURN_INTERVAL = 1.0;
            const float LIGHTNING_DAMAGE_BASE = 5.0;
            const float LIGHTNING_DAMAGE_PER_LEVEL = 5.0;
            const float LIGHTNING_INTERVAL_BASE = 2.0;
            const float BLACKHOLE_DAMAGE_BASE = 1.0;
            const float BLACKHOLE_DAMAGE_PER_LEVEL = 1.0;
            const float WEAK_SPEED_REDUCTION = 0.1;
            const float WEAK_DAMAGE_REDUCTION = 0.2;
            const float CHARM_ATTACK_SPEED_MIN = 0.7;
            const float CHARM_ATTACK_SPEED_MAX = 0.9;
            const float FREEZE_DURATION = 2.0;
            const float SLOW_DECAY_INTERVAL = 3.0;
            const float SLOW_BASE = 0.15;
            const float SLOW_PER_LEVEL = 0.05;
            const float LIGHTNING_DECAY_INTERVAL = 8.0;
            
            // 状态标志
            const int STATE_CHARMED = 1;
            const int STATE_BURNING = 2;
            const int STATE_FROZEN = 4;
            const int STATE_SLOWED = 8;
            const int STATE_LIGHTNING = 16;
            const int STATE_BLACKHOLE = 32;
            const int STATE_WEAKENED = 64;
            
            // 阵营
            const int CAMP_ENEMY = 0;
            const int CAMP_ALLY = 1;
            
            out vec4 fragColor;
            
            // 解码敌人数据
            struct Enemy {
                float x, y;
                float hp, maxHp;
                float speed;
                float attackCooldown;
                float stateFlags;
                float stateParams[7];
                float stateTimers[7];
                float camp;
                float targetEnemy;
                float attackSpeedMult;
                float baseSpeed;
                float isStunned;
                float stunTimer;
            };
            
            // 从纹理读取敌人数据
            Enemy decodeEnemy(vec2 coord) {
                Enemy e;
                // 略：实际从纹理采样解码
                // ...
                return e;
            }
            
            // 编码敌人数据到输出
            vec4 encodeEnemy(Enemy e) {
                // 略：编码到纹理像素
                // ...
                return vec4(0.0);
            }
            
            void main() {
                vec2 coord = gl_FragCoord.xy / u_dataSize;
                Enemy enemy = decodeEnemy(coord);
                
                // ----- 计算状态更新（并行处理每个敌人） -----
                float dt = u_deltaTime;
                float level = u_playerLevel;
                
                // 1. 火焰伤害
                if (enemy.stateTimers[1] > 0.0) {
                    float damage = BURN_DAMAGE_BASE + (enemy.stateParams[1] - 1.0) * BURN_DAMAGE_PER_LEVEL;
                    // 累积伤害（在CPU端应用）
                    enemy.hp -= damage * dt * (1.0 / BURN_INTERVAL);
                    enemy.stateTimers[1] -= dt;
                    if (enemy.stateTimers[1] <= 0.0) {
                        enemy.stateFlags -= float(STATE_BURNING);
                        enemy.stateParams[1] = 0.0;
                    }
                }
                
                // 2. 冷冻
                if (enemy.stateTimers[2] > 0.0) {
                    enemy.stateTimers[2] -= dt;
                    if (enemy.stateTimers[2] <= 0.0) {
                        enemy.stateFlags -= float(STATE_FROZEN);
                    }
                }
                
                // 3. 电离子
                if (enemy.stateTimers[4] > 0.0) {
                    enemy.stateTimers[4] -= dt;
                    if (enemy.stateTimers[4] <= 0.0) {
                        enemy.stateFlags -= float(STATE_LIGHTNING);
                        enemy.stateParams[4] = 0.0;
                    }
                }
                
                // 4. 减速衰减
                if (enemy.stateTimers[3] > 0.0) {
                    enemy.stateTimers[3] -= dt;
                    if (enemy.stateTimers[3] <= 0.0) {
                        enemy.stateParams[3] = max(0.0, enemy.stateParams[3] - 1.0);
                        if (enemy.stateParams[3] <= 0.0) {
                            enemy.stateFlags -= float(STATE_SLOWED);
                            enemy.stateTimers[3] = 0.0;
                        } else {
                            enemy.stateTimers[3] = SLOW_DECAY_INTERVAL;
                        }
                    }
                }
                
                // 5. 虚弱衰减
                if (enemy.stateTimers[6] > 0.0) {
                    enemy.stateTimers[6] -= dt;
                    if (enemy.stateTimers[6] <= 0.0) {
                        enemy.stateParams[6] = max(0.0, enemy.stateParams[6] - 1.0);
                        if (enemy.stateParams[6] <= 0.0) {
                            enemy.stateFlags -= float(STATE_WEAKENED);
                            enemy.stateTimers[6] = 0.0;
                        } else {
                            enemy.stateTimers[6] = SLOW_DECAY_INTERVAL;
                        }
                    }
                }
                
                // 6. 魅惑阵营切换
                if (enemy.stateTimers[0] > 0.0) {
                    enemy.camp = float(CAMP_ALLY);
                    enemy.stateTimers[0] -= dt;
                    // 攻击速度调整
                    enemy.attackSpeedMult = CHARM_ATTACK_SPEED_MIN + 
                        (CHARM_ATTACK_SPEED_MAX - CHARM_ATTACK_SPEED_MIN) * 
                        (enemy.stateTimers[0] / 10.0);
                    if (enemy.stateTimers[0] <= 0.0) {
                        enemy.stateFlags -= float(STATE_CHARMED);
                        enemy.camp = float(CAMP_ENEMY);
                        enemy.attackSpeedMult = 1.0;
                        enemy.targetEnemy = -1.0;
                    }
                }
                
                // 7. 速度计算（考虑所有减速效果）
                float speedMult = 1.0;
                if (enemy.stateTimers[2] > 0.0) { // 冰冻
                    speedMult = 0.0;
                } else {
                    if (enemy.stateParams[3] > 0.0) {
                        float slowPercent = SLOW_BASE + (enemy.stateParams[3] - 1.0) * SLOW_PER_LEVEL;
                        speedMult *= (1.0 - min(slowPercent, 0.45));
                    }
                    if (enemy.stateParams[6] > 0.0) {
                        speedMult *= (1.0 - enemy.stateParams[6] * WEAK_SPEED_REDUCTION);
                    }
                    speedMult *= enemy.attackSpeedMult;
                }
                enemy.speed = enemy.baseSpeed * speedMult;
                
                // 8. 魅惑攻击逻辑（在CPU端处理寻敌）
                // GPU只标记状态，寻敌在CPU完成
                
                // 输出更新后的数据
                fragColor = encodeEnemy(enemy);
            }
        `;

        // 编译着色器...
        // 完整实现略，实际项目中可使用 GPU.js 库
    }

    initBuffers() {
        // 创建输入/输出纹理缓冲区
        // 使用 RGB 纹理存储敌人数据（每个像素编码一个敌人的所有状态）
    }

    // 更新敌人数据到GPU
    uploadEnemyData(enemies) {
        if (!this.initialized) return;
        // 将 enemies 数组编码为纹理数据
        // 每个敌人编码为 4 个像素（RGBA * 4 = 16 个 float）
        const data = new Float32Array(this.maxEnemies * 16);
        for (let i = 0; i < Math.min(enemies.length, this.maxEnemies); i++) {
            const e = enemies[i];
            // 编码...
        }
        // 上传到纹理
    }

    // 执行GPU计算
    compute(deltaTime, playerLevel) {
        if (!this.initialized) return;
        // 执行计算着色器
        // 从输出纹理读取结果
        // 应用到 enemies 数组
    }

    // 回读结果
    readbackData() {
        // 从输出纹理读取，更新敌人数据
    }

    // 状态辅助函数（CPU 端调用）
    applyState(enemy, state, params, duration) {
        enemy.stateFlags |= state;
        const idx = Math.log2(state);
        enemy.stateParams[idx] = params || 1;
        enemy.stateTimers[idx] = duration;
        
        // 特殊状态处理
        if (state === STATE_FLAGS.CHARMED) {
            enemy.camp = CAMP.ALLY;
            // 寻找最近的其他敌人作为目标（在CPU端处理）
            // this.findNearestEnemy(enemy);
        }
    }
}

// 导出 GPU 计算实例
const gpuCompute = new GPUCompute();
window.gpuCompute = gpuCompute;