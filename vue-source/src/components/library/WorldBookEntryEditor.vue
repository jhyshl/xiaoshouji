<script setup>
const props = defineProps({
  entry: { type: Object, required: true },
  index: { type: Number, required: true },
});
const emit = defineEmits(["delete"]);

function updateKeys(event) {
  props.entry.keys = event.target.value
    .split(/[,，\n|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function updateSecondaryKeys(event) {
  props.entry.secondaryKeys = event.target.value
    .split(/[,，\n|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
</script>

<template>
  <article class="worldbook-entry-editor">
    <header>
      <label class="switch-control">
        <input v-model="entry.enabled" type="checkbox" />
        <span></span>
      </label>
      <strong>条目 {{ index + 1 }}</strong>
      <button type="button" aria-label="删除条目" @click="emit('delete')">×</button>
    </header>
    <label class="modal-field"><span>条目名称</span><input v-model="entry.comment" /></label>
    <label class="modal-field"><span>关键词（逗号或换行分隔）</span><textarea :value="entry.keys.join(', ')" rows="2" @input="updateKeys"></textarea></label>
    <label class="modal-field"><span>次关键词</span><textarea :value="entry.secondaryKeys.join(', ')" rows="2" @input="updateSecondaryKeys"></textarea></label>
    <label class="modal-field"><span>条目内容</span><textarea v-model="entry.content" rows="6" required></textarea></label>
    <div class="entry-options">
      <label><input v-model="entry.constant" type="checkbox" /> 常驻</label>
      <label><input v-model="entry.selective" type="checkbox" /> 选择性匹配</label>
      <label>优先级 <input v-model.number="entry.priority" type="number" /></label>
    </div>
  </article>
</template>
