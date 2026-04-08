<template>
  <span ref="el" class="count-up">{{ formattedValue }}</span>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  endValue: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    default: 2000
  },
  decimals: {
    type: Number,
    default: 0
  },
  suffix: {
    type: String,
    default: ''
  }
})

const el = ref(null)
const displayValue = ref(0)
let animationId = null
let startTime = null

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          startCounting()
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.5 }
  )

  if (el.value) {
    observer.observe(el.value)
  }
})

function startCounting() {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }

  startTime = null
  animationId = requestAnimationFrame(animate)
}

function animate(timestamp) {
  if (!startTime) startTime = timestamp
  const progress = Math.min((timestamp - startTime) / props.duration, 1)
  const easeOutQuart = 1 - Math.pow(1 - progress, 4)

  displayValue.value = easeOutQuart * props.endValue
  animationId = requestAnimationFrame(animate)

  if (progress >= 1) {
    cancelAnimationFrame(animationId)
  }
}

const formattedValue = computed(() => {
  return displayValue.value.toFixed(props.decimals) + props.suffix
})
</script>

<style scoped>
.count-up {
  display: inline-block;
}
</style>
