// 战斗音乐引擎（BPM=155，d小调，节奏强化版）
const Music = (function() {
    let audioCtx = null;
    let isPlaying = false;
    let nextNoteTime = 0;
    let currentSection = 'P'; // P:前奏, A:主体A, B:主体B
    let timerID = null;
    let gainNode = null;
    
    // 节奏参数（加快）
    const BPM = 155;
    const SECONDS_PER_BEAT = 60 / BPM;
    const SECONDS_PER_MEASURE = SECONDS_PER_BEAT * 4;
    const BEAT_DIVISION = 4;
    const TICK_TIME = SECONDS_PER_BEAT / BEAT_DIVISION;
    
    // 音色合成器
    function playKick(time, volume=0.4) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 60;
        osc.connect(gain);
        gain.connect(gainNode);
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
        osc.start(time);
        osc.stop(time + 0.05);
    }
    function playSnare(time, volume=0.22) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 180;
        osc.connect(gain);
        gain.connect(gainNode);
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
        osc.start(time);
        osc.stop(time + 0.08);
    }
    function playSnareRoll(time, count=3) {
        for(let i=0;i<count;i++) {
            const t = time + i * 0.035;
            playSnare(t, 0.12);
        }
    }
    function playClosedHat(time) {
        const gain = audioCtx.createGain();
        const bufferSize = 4096;
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0;i<bufferSize;i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 4000;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(gainNode);
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
        noise.start(time);
        noise.stop(time + 0.03);
    }
    function playOpenHat(time) {
        const gain = audioCtx.createGain();
        const bufferSize = 4096;
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0;i<bufferSize;i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 6000;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(gainNode);
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
        noise.start(time);
        noise.stop(time + 0.12);
    }
    function playCrash(time) {
        const gain = audioCtx.createGain();
        const bufferSize = 4096;
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0;i<bufferSize;i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 3000;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(gainNode);
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
        noise.start(time);
        noise.stop(time + 0.3);
    }
    
    // 贝斯部分（简化，保持原有）
    const bassNotes = {
        'D2': 73.42, 'A#1': 58.27, 'G1': 49.00, 'F1': 43.65, 'Eb1': 38.89
    };
    function playBass(time, note, dur=0.12) {
        const freq = bassNotes[note];
        if(!freq) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(gainNode);
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
        osc.start(time);
        osc.stop(time + dur);
    }
    
    // 旋律映射（同上）
    const melodyMap = {
        '1': 293.66, '2': 329.63, '3': 349.23, '4': 392.00, '5': 440.00,
        '6': 466.16, '7': 493.88, '1·': 587.33, '2·': 659.25, '3·': 698.46,
        '4·': 783.99, '5·': 880.00, '6·': 932.33, '7·': 987.77,
        '1#': 311.13, '2#': 349.23, '4#': 415.30, '5#': 466.16, '6#': 493.88,
        '3#': 369.99
    };
    function playMelody(time, note, dur=0.1) {
        const freq = melodyMap[note];
        if(!freq) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(gainNode);
        gain.gain.setValueAtTime(0.18, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
        osc.start(time);
        osc.stop(time + dur);
    }
    
    // 电音Lead（快速叠加）
    function playLead(time, note, dur=0.06) {
        const freq = melodyMap[note];
        if(!freq) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(gainNode);
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
        osc.start(time);
        osc.stop(time + dur);
    }
    
    // 和弦背景（长音）
    function playChord(time, notes, dur=SECONDS_PER_MEASURE) {
        notes.forEach(note => {
            let freq = melodyMap[note];
            if(!freq) freq = 261.63;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(gainNode);
            gain.gain.setValueAtTime(0.1, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
            osc.start(time);
            osc.stop(time + dur);
        });
    }
    
    // ========== 全新节奏模式（激进）==========
    // 鼓点模式：以16分音符为单位，长度16 * 2 = 32个tick（两小节循环，实现更多变化）
    // 这里定义两个小节（32个16分音符）的鼓点序列
    const drumPattern32 = Array(32).fill('');
    // 第1小节（索引0-15）
    // 底鼓：第1、第5、第9、第13、增加第3(双踩感觉)、第11
    for(let i=0;i<16;i++) {
        if(i===0 || i===4 || i===8 || i===12) drumPattern32[i] = (drumPattern32[i]||'') + 'kick';
        if(i===2 || i===10) drumPattern32[i] = (drumPattern32[i]||'') + 'kick';
    }
    // 军鼓：第5、第13位置（正拍），加上第3、第11的弱击滚奏
    for(let i=0;i<16;i++) {
        if(i===4 || i===12) drumPattern32[i] = (drumPattern32[i]||'') + 'snare';
        if(i===6 || i===14) drumPattern32[i] = (drumPattern32[i]||'') + 'snareRoll';
    }
    // 闭镲：每个16分音符都有一点（除了某些位置用开镲代替）
    for(let i=0;i<16;i++) {
        if(i!==15) drumPattern32[i] = (drumPattern32[i]||'') + 'hat';
    }
    // 开镲：第4拍的最后一个16分音符（索引15）和下一小节第4拍最后一个（索引31）
    drumPattern32[15] = (drumPattern32[15]||'') + 'openHat';
    drumPattern32[31] = (drumPattern32[31]||'') + 'openHat';
    // 碎镲：每小节的第1拍正拍
    drumPattern32[0] = (drumPattern32[0]||'') + 'crash';
    drumPattern32[16] = (drumPattern32[16]||'') + 'crash';
    // 增加更多切分底鼓：第6、第14，第9位置已经有，再加第1小节的第10?  保持冲击力
    drumPattern32[6] = (drumPattern32[6]||'') + 'kick';
    drumPattern32[14] = (drumPattern32[14]||'') + 'kick';
    
    // 第2小节（索引16-31）与前一小节类似但略有变化：增加一些滚奏密度
    for(let i=16;i<32;i++) {
        let idx = i-16;
        if(idx===0 || idx===4 || idx===8 || idx===12) drumPattern32[i] = (drumPattern32[i]||'') + 'kick';
        if(idx===2 || idx===10) drumPattern32[i] = (drumPattern32[i]||'') + 'kick';
        if(idx===4 || idx===12) drumPattern32[i] = (drumPattern32[i]||'') + 'snare';
        if(idx===6 || idx===14) drumPattern32[i] = (drumPattern32[i]||'') + 'snareRoll';
        if(idx!==15) drumPattern32[i] = (drumPattern32[i]||'') + 'hat';
        if(idx===15) drumPattern32[i] = (drumPattern32[i]||'') + 'openHat';
        if(idx===0) drumPattern32[i] = (drumPattern32[i]||'') + 'crash';
        // 额外第2小节增加一个额外的军鼓滚奏在第9位置增强
        if(idx===8) drumPattern32[i] = (drumPattern32[i]||'') + 'snareRoll';
    }
    
    // 贝斯序列（每拍一个音，共4个）
    const bassSeq = {
        'P': ['D2','D2','D2','D2'],
        'A': ['D2','A#1','G1','F1'],
        'B': ['D2','G1','F1','Eb1']
    };
    
    // 旋律序列（简谱，与之前相同）
    const melodySeq = {
        'P': ['1','3','4','5','6','7','1·','3·','5·','4','3','1','7','6','5','4',
              '1','3','4','5','6','7','1·','3·','5·','4','3','1','7','6','5','4'],
        'A': ['1','3','4','5','6','7','1·','3·','5·','4','3','1','7','6','5','4',
              '1','3','4','5','6','7','1·','3·','5·','4','3','1','7','6','5','4'],
        'B': ['1#','3','4','5','6','7','1·','3·','5·','4','3','2#','7','6#','5','4',
              '1','3','4','5','6','7','1·','3·','5·','4','3','1','7','6','5','4']
    };
    
    // 和弦进行
    const chordProg = {
        'P': [['1','3','5'],['1','3','5'],['1','3','5'],['1','3','5']],
        'A': [['1','3','5'],['4','6','1·'],['1','3','5'],['4','6','1·'],
              ['1','3','5'],['4','6','1·'],['1','3','5'],['5','7','2·']],
        'B': [['1','3','5'],['6','1·','3·'],['1','3','5'],['6','1·','3·'],
              ['1','3','5'],['6','1·','3·'],['1','3','5'],['5','7','2·']]
    };
    
    function getLeadNote(melodyNote) {
        let match = melodyNote.match(/^(\d+)([#·]?)/);
        if(match) {
            let num = parseInt(match[1]);
            let suffix = match[2] || '';
            let newNum = num + 2;
            if(newNum > 7) newNum -= 7;
            return newNum + suffix;
        }
        return melodyNote;
    }
    
    let measuresPlayed = 0;
    let startTime = 0;
    
    function scheduleTick(now) {
        if(!audioCtx || !isPlaying) return;
        const tickTime = nextNoteTime;
        const elapsed = tickTime - startTime;
        // 32分音符基准，每16个tick为1小节（因为TICK_TIME是16分音符，2小节=32个tick）
        const tickIndex = Math.floor(elapsed / TICK_TIME);
        const twoMeasureIndex = tickIndex % 32;   // 两小节循环
        const subTick = twoMeasureIndex;          // 0-31
        const measure = Math.floor(tickIndex / 16);
        
        // 鼓点
        const actions = drumPattern32[subTick];
        if(actions) {
            if(actions.includes('kick')) playKick(tickTime);
            if(actions.includes('snare')) playSnare(tickTime);
            if(actions.includes('snareRoll')) playSnareRoll(tickTime, 2);
            if(actions.includes('hat')) playClosedHat(tickTime);
            if(actions.includes('openHat')) playOpenHat(tickTime);
            if(actions.includes('crash')) playCrash(tickTime);
        }
        
        // 贝斯 (每拍一次，即每4个16分音符)
        if(tickIndex % 4 === 0) {
            let pattern = bassSeq[currentSection];
            let idx = (Math.floor(tickIndex/4)) % 4;
            let note = pattern[idx];
            if(note) playBass(tickTime, note, 0.12);
        }
        
        // 旋律（每1/4拍一个音，即每4个16分音符）
        if(tickIndex % 4 === 0) {
            let seq = melodySeq[currentSection];
            let idx = (Math.floor(tickIndex/4)) % seq.length;
            let note = seq[idx];
            if(note) playMelody(tickTime, note, 0.1);
        }
        
        // 电音Lead（每1/8拍，即每2个16分音符）
        if(tickIndex % 2 === 0) {
            let seq = melodySeq[currentSection];
            let idx = (Math.floor(tickIndex/2)) % seq.length;
            let melodyNote = seq[idx];
            if(melodyNote) {
                let leadNote = getLeadNote(melodyNote);
                if(leadNote) playLead(tickTime, leadNote, 0.05);
            }
        }
        
        // 和弦 (每小节开始，即tickIndex%16 ===0)
        if(tickIndex % 16 === 0) {
            let prog = chordProg[currentSection];
            let chordIdx = (Math.floor(tickIndex/16)) % prog.length;
            let chordNotes = prog[chordIdx];
            if(chordNotes) playChord(tickTime, chordNotes, SECONDS_PER_MEASURE);
        }
        
        // 曲式切换
        if(tickIndex % 16 === 15) {
            let totalMeasures = Math.floor((tickIndex+1)/16);
            if(currentSection === 'P' && totalMeasures >= 4) {
                currentSection = 'A';
                measuresPlayed = 0;
                playCrash(tickTime + 0.05);
            } else if(currentSection === 'A' && totalMeasures >= 8) {
                currentSection = 'B';
                measuresPlayed = 0;
                playCrash(tickTime + 0.05);
            } else if(currentSection === 'B' && totalMeasures >= 8) {
                currentSection = 'A';
                measuresPlayed = 0;
                playCrash(tickTime + 0.05);
            }
        }
        
        nextNoteTime += TICK_TIME;
        timerID = setTimeout(() => scheduleTick(performance.now()), 
                         Math.max(0, (nextNoteTime - audioCtx.currentTime) * 1000));
    }
    
    function _start() {
        if(!audioCtx) return;
        isPlaying = true;
        currentSection = 'P';
        startTime = audioCtx.currentTime;
        nextNoteTime = startTime;
        scheduleTick(startTime);
    }
    
    function play() {
        if(isPlaying) return;
        if(!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioCtx.createGain();
            gainNode.gain.value = 0.5;
            gainNode.connect(audioCtx.destination);
        }
        if(audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => _start());
        } else {
            _start();
        }
    }
    
    function stop(fadeOut=0.6) {
        if(!isPlaying) return;
        isPlaying = false;
        if(timerID) clearTimeout(timerID);
        if(gainNode) {
            const now = audioCtx.currentTime;
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + fadeOut);
            setTimeout(() => {
                if(audioCtx) audioCtx.close();
                audioCtx = null;
                gainNode = null;
            }, fadeOut*1000);
        }
    }
    
    return { play, stop };
})();