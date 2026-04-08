<template>
  <div class="home">
    <div class="hero">
      <div class="float-glow glow-1"></div>
      <div class="float-glow glow-2"></div>
      <div class="float-glow glow-3"></div>

      <div class="hero-content">
        <FadeIn>
          <h1 class="gradient-text">高效刷题，轻松备考</h1>
        </FadeIn>
        <FadeIn :delay="100">
          <p class="subtitle">智能化学习平台，助你突破学习瓶颈</p>
        </FadeIn>
        <FadeIn :delay="200">
          <div class="actions">
            <el-button type="primary" size="large" @click="$router.push('/questions')" class="primary-btn">
              开始刷题
            </el-button>
            <el-button size="large" @click="$router.push('/login')" v-if="!isLoggedIn" class="secondary-btn">
              登录账号
            </el-button>
          </div>
        </FadeIn>

        <FadeIn :delay="400">
          <div class="dashboard-preview">
            <div class="dashboard-header">
              <div class="dashboard-title">学习仪表盘</div>
              <div class="dashboard-status">
                <span class="status-dot"></span>
                实时更新
              </div>
            </div>
            <div class="dashboard-cards">
              <div class="mini-card">
                <div class="mini-value">
                  <CountUp :endValue="2348" :duration="2000" />
                </div>
                <div class="mini-label">已答题数</div>
              </div>
              <div class="mini-card">
                <div class="mini-value">
                  <CountUp :endValue="92.5" :decimals="1" :duration="2000" suffix="%" />
                </div>
                <div class="mini-label">正确率</div>
              </div>
              <div class="mini-card">
                <div class="mini-value">
                  <CountUp :endValue="156" :duration="2000" />
                </div>
                <div class="mini-label">练习天数</div>
              </div>
            </div>
            <div class="chart-placeholder">
              <div class="chart-bars">
                <div class="chart-bar" style="height: 40%; animation-delay: 0s;"></div>
                <div class="chart-bar" style="height: 55%; animation-delay: 0.1s;"></div>
                <div class="chart-bar" style="height: 70%; animation-delay: 0.2s;"></div>
                <div class="chart-bar" style="height: 60%; animation-delay: 0.3s;"></div>
                <div class="chart-bar" style="height: 85%; animation-delay: 0.4s;"></div>
                <div class="chart-bar" style="height: 75%; animation-delay: 0.5s;"></div>
                <div class="chart-bar" style="height: 90%; animation-delay: 0.6s;"></div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>

    <div class="section stats-section">
      <div class="section-header">
        <FadeIn>
          <h2 class="section-title">学习数据</h2>
          <p class="section-desc">实时追踪你的学习进度</p>
        </FadeIn>
      </div>
      <div class="stats-grid">
        <FadeIn :delay="0">
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon :size="32"><Document /></el-icon>
            </div>
            <div class="stat-value">
              <CountUp :endValue="2348" :duration="2000" />
            </div>
            <div class="stat-label">已答题数</div>
          </div>
        </FadeIn>
        <FadeIn :delay="100">
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon :size="32"><TrendCharts /></el-icon>
            </div>
            <div class="stat-value">
              <CountUp :endValue="92.5" :decimals="1" :duration="2000" suffix="%" />
            </div>
            <div class="stat-label">正确率</div>
          </div>
        </FadeIn>
        <FadeIn :delay="200">
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon :size="32"><DataAnalysis /></el-icon>
            </div>
            <div class="stat-value">
              <CountUp :endValue="5678" :duration="2000" />
            </div>
            <div class="stat-label">题库总数</div>
          </div>
        </FadeIn>
        <FadeIn :delay="300">
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon :size="32"><Timer /></el-icon>
            </div>
            <div class="stat-value">
              <CountUp :endValue="128" :duration="2000" suffix="小时" />
            </div>
            <div class="stat-label">学习时长</div>
          </div>
        </FadeIn>
      </div>
    </div>

    <div class="section features-section">
      <div class="section-header">
        <FadeIn>
          <h2 class="section-title">核心功能</h2>
          <p class="section-desc">全方位提升你的学习效率</p>
        </FadeIn>
      </div>
      <div class="features-grid">
        <FadeIn :delay="0">
          <div class="feature-card">
            <div class="feature-icon">
              <el-icon :size="48"><Reading /></el-icon>
            </div>
            <h3>海量题库</h3>
            <p>涵盖各学科的精选题目，满足多样化学习需求</p>
          </div>
        </FadeIn>
        <FadeIn :delay="100">
          <div class="feature-card">
            <div class="feature-icon">
              <el-icon :size="48"><TrendCharts /></el-icon>
            </div>
            <h3>智能练习</h3>
            <p>多种练习模式，个性化学习路径，高效提升</p>
          </div>
        </FadeIn>
        <FadeIn :delay="200">
          <div class="feature-card">
            <div class="feature-icon">
              <el-icon :size="48"><DataAnalysis /></el-icon>
            </div>
            <h3>数据统计</h3>
            <p>详细分析你的学习进度，发现薄弱环节</p>
          </div>
        </FadeIn>
        <FadeIn :delay="300">
          <div class="feature-card">
            <div class="feature-icon">
              <el-icon :size="48"><Star /></el-icon>
            </div>
            <h3>错题收藏</h3>
            <p>针对性复习薄弱知识点，巩固学习成果</p>
          </div>
        </FadeIn>
        <FadeIn :delay="400">
          <div class="feature-card">
            <div class="feature-icon">
              <el-icon :size="48"><EditPen /></el-icon>
            </div>
            <h3>笔记功能</h3>
            <p>边刷题边记笔记，整理思路，加深记忆</p>
          </div>
        </FadeIn>
        <FadeIn :delay="500">
          <div class="feature-card">
            <div class="feature-icon">
              <el-icon :size="48"><Timer /></el-icon>
            </div>
            <h3>限时训练</h3>
            <p>模拟考试环境，提升答题速度和应试能力</p>
          </div>
        </FadeIn>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { Reading, TrendCharts, DataAnalysis, Star, Document, Timer, EditPen } from '@element-plus/icons-vue'
import FadeIn from '@/components/common/FadeIn.vue'
import CountUp from '@/components/common/CountUp.vue'
import api from '@/api'

const userStore = useUserStore()
const isLoggedIn = computed(() => userStore.isLoggedIn)

onMounted(async () => {
  if (isLoggedIn.value) {
    try {
      await api.get('/stats/progress')
    } catch (error) {
      console.error('获取统计数据失败', error)
    }
  }
})
</script>

<style scoped>
.home {
  overflow: hidden;
}

.hero {
  position: relative;
  min-height: calc(100vh - 64px);
  padding: 80px 20px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.float-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
  pointer-events: none;
}

.glow-1 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  top: -100px;
  left: -100px;
  animation: float 8s ease-in-out infinite;
}

.glow-2 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #f093fb, #f5576c);
  top: 50%;
  right: -50px;
  animation: float 10s ease-in-out infinite reverse;
}

.glow-3 {
  width: 350px;
  height: 350px;
  background: linear-gradient(135deg, #4facfe, #00f2fe);
  bottom: -100px;
  left: 30%;
  animation: float 12s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) rotate(0deg) scale(1);
  }
  25% {
    transform: translate(30px, -30px) rotate(5deg) scale(1.1);
  }
  50% {
    transform: translate(0, -50px) rotate(0deg) scale(1);
  }
  75% {
    transform: translate(-30px, -30px) rotate(-5deg) scale(0.9);
  }
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  width: 100%;
  text-align: center;
}

.gradient-text {
  font-size: 3.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 20px;
  line-height: 1.2;
}

.subtitle {
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 40px;
}

.actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 60px;
}

.primary-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  padding: 16px 40px;
  font-size: 1.1rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 16px 40px;
  font-size: 1.1rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.dashboard-preview {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 30px;
  max-width: 700px;
  margin: 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.dashboard-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: white;
}

.dashboard-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.dashboard-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.mini-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.mini-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: white;
  margin-bottom: 4px;
}

.mini-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

.chart-placeholder {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 24px;
  height: 150px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 12px;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 100%;
  width: 100%;
  justify-content: center;
}

.chart-bar {
  width: 30px;
  background: linear-gradient(180deg, #667eea, #764ba2);
  border-radius: 8px 8px 0 0;
  animation: barGrow 1.5s ease-out forwards;
  transform-origin: bottom;
}

@keyframes barGrow {
  from {
    transform: scaleY(0);
    opacity: 0;
  }
  to {
    transform: scaleY(1);
    opacity: 1;
  }
}

.section {
  padding: 100px 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 12px;
}

.section-desc {
  font-size: 1.1rem;
  color: #64748b;
}

.stats-section {
  background: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.stat-card {
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: white;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 1rem;
  color: #64748b;
}

.features-section {
  background: #f8fafc;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.feature-card {
  background: white;
  border-radius: 16px;
  padding: 40px 30px;
  text-align: center;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.feature-card:hover {
  transform: translateY(-8px);
  border-color: #667eea;
  box-shadow: 0 20px 40px rgba(102, 126, 234, 0.15);
}

.feature-card:hover .feature-icon {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  transform: scale(1.1);
}

.feature-icon {
  width: 80px;
  height: 80px;
  background: #f1f5f9;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  color: #667eea;
  transition: all 0.3s ease;
}

.feature-card h3 {
  font-size: 1.4rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
}

.feature-card p {
  color: #64748b;
  line-height: 1.6;
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .gradient-text {
    font-size: 2.8rem;
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 60px 20px;
  }
  .gradient-text {
    font-size: 2rem;
  }
  .subtitle {
    font-size: 1.1rem;
  }
  .actions {
    flex-direction: column;
  }
  .dashboard-cards {
    grid-template-columns: 1fr;
  }
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .features-grid {
    grid-template-columns: 1fr;
  }
  .section {
    padding: 60px 20px;
  }
  .section-title {
    font-size: 2rem;
  }
}
</style>
