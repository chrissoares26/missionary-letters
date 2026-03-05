<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUploadCampaignImage, useDeleteCampaignImage } from '@/queries/campaigns'
import { useToast } from '@/composables/useToast'

interface Props {
  campaignId: string
  modelValue: string[] // Array of image URLs
  maxImages?: number
  maxSizeMB?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxImages: 5,
  maxSizeMB: 5,
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const uploadMutation = useUploadCampaignImage()
const deleteMutation = useDeleteCampaignImage()
const dragOver = ref(false)
const { error: showToastError } = useToast()

const isUploading = computed(() => uploadMutation.isLoading.value)
const isDeleting = computed(() => deleteMutation.isLoading.value)

const images = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const canAddMore = computed(() => images.value.length < props.maxImages)

function openFileDialog() {
  fileInput.value?.click()
}

async function handleFiles(files: FileList | null) {
  if (!files || !canAddMore.value) return

  const filesArray = Array.from(files)
  const validFiles = filesArray.filter((file) => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      showToastError(`${file.name} não é uma imagem válida`)
      return false
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > props.maxSizeMB) {
      showToastError(`${file.name} é muito grande (max ${props.maxSizeMB}MB)`)
      return false
    }

    return true
  })

  // Upload files
  for (const file of validFiles) {
    if (!canAddMore.value) break

    try {
      const url = await uploadMutation.mutateAsync({
        campaignId: props.campaignId,
        file,
      })
      images.value = [...images.value, url]
    } catch (error) {
      console.error('Upload failed:', error)
      showToastError(`Erro ao enviar ${file.name}`)
    }
  }
}

function handleFileInput(event: Event) {
  const target = event.target as HTMLInputElement
  handleFiles(target.files)
  // Reset input so same file can be selected again
  target.value = ''
}

function handleDrop(event: DragEvent) {
  dragOver.value = false
  handleFiles(event.dataTransfer?.files ?? null)
}

async function removeImage(imageUrl: string) {
  try {
    await deleteMutation.mutateAsync(imageUrl)
    images.value = images.value.filter((url) => url !== imageUrl)
  } catch (error) {
    console.error('Delete failed:', error)
    showToastError('Erro ao deletar imagem')
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Upload zone -->
    <div
      v-if="canAddMore"
      class="border-2 border-dashed rounded-lg p-8 text-center transition-colors"
      :class="dragOver ? 'border-[var(--action-primary)] bg-[var(--bg-muted)]' : 'border-[var(--border-default)]'"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="handleDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        class="hidden"
        @change="handleFileInput"
      />

      <button
        type="button"
        class="px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg hover:opacity-90"
        :disabled="isUploading"
        @click="openFileDialog"
      >
        {{ isUploading ? 'Enviando...' : 'Adicionar Imagens' }}
      </button>

      <p class="mt-2 text-sm text-[var(--text-secondary)]">
        ou arraste imagens aqui
      </p>

      <p class="mt-1 text-xs text-[var(--text-secondary)]">
        Máx {{ maxImages }} imagens, {{ maxSizeMB }}MB cada (JPG, PNG, WEBP)
      </p>
    </div>

    <!-- Image grid -->
    <div v-if="images.length > 0" class="grid grid-cols-3 gap-4">
      <div
        v-for="(imageUrl, index) in images"
        :key="imageUrl"
        class="relative aspect-square rounded-lg overflow-hidden bg-[var(--bg-muted)] group"
      >
        <img
          :src="imageUrl"
          :alt="`Imagem ${index + 1}`"
          class="w-full h-full object-cover"
        />

        <!-- Delete button overlay -->
        <button
          type="button"
          class="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          :disabled="isDeleting"
          @click="removeImage(imageUrl)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Count -->
    <p v-if="images.length > 0" class="text-sm text-[var(--text-secondary)]">
      {{ images.length }} / {{ maxImages }} imagens
    </p>
  </div>
</template>
