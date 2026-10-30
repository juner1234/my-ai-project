extends Node

const SETTINGS_PATH := "user://preferences.cfg"
var world
var paused := true
var quality := 1
var sensitivity := 0.0025
var panel: PanelContainer
var enter_button: Button
var quality_picker: OptionButton
var fps_label: Label
var elapsed := 0.0

func setup(target: Node3D) -> void:
	world = target
	Engine.max_fps = 60
	get_tree().auto_accept_quit = false
	if not "--self-test" in OS.get_cmdline_user_args():
		var settings := ConfigFile.new()
		if settings.load(SETTINGS_PATH) == OK:
			quality = clampi(int(settings.get_value("display", "quality", 1)), 0, 2)
			sensitivity = clampf(float(settings.get_value("controls", "sensitivity", 0.0025)), 0.001, 0.006)
	var layer := CanvasLayer.new()
	layer.layer = 10
	add_child(layer)
	var root := Control.new()
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(root)
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var centre := CenterContainer.new()
	root.add_child(centre)
	centre.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	centre.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel = PanelContainer.new()
	centre.add_child(panel)
	panel.custom_minimum_size = Vector2(470, 0)
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.07, 0.12, 0.10, 0.96)
	style.set_corner_radius_all(14)
	style.content_margin_left = 28
	style.content_margin_right = 28
	style.content_margin_top = 25
	style.content_margin_bottom = 25
	panel.add_theme_stylebox_override("panel", style)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 13)
	panel.add_child(box)
	var title := Label.new()
	title.text = "苔光别墅"
	title.add_theme_font_size_override("font_size", 30)
	box.add_child(title)
	var help := Label.new()
	help.text = "庭院、湖边与两层小屋，慢慢走走。\nWASD 移动 · 鼠标转向 · E 开门\n1 / 2 / 3 切换时段 · Tab 布置家具\nEsc 暂停 · 空格跳跃"
	help.add_theme_font_size_override("font_size", 16)
	box.add_child(help)
	quality_picker = OptionButton.new()
	for text in ["流畅 · 适合较低功耗", "均衡 · 首次试玩建议", "精细 · 更多阴影和远处花草"]: quality_picker.add_item(text)
	quality_picker.select(quality)
	quality_picker.item_selected.connect(set_quality)
	box.add_child(quality_picker)
	var label := Label.new()
	label.text = "视角灵敏度"
	box.add_child(label)
	var slider := HSlider.new()
	slider.min_value = 0.001
	slider.max_value = 0.006
	slider.step = 0.00025
	slider.value = sensitivity
	slider.value_changed.connect(func(value: float): sensitivity = value)
	box.add_child(slider)
	enter_button = Button.new()
	enter_button.text = "进入花园"
	enter_button.custom_minimum_size.y = 42
	enter_button.pressed.connect(resume)
	box.add_child(enter_button)
	var home := Button.new()
	home.text = "回到入口"
	home.pressed.connect(return_home)
	box.add_child(home)
	var save := Button.new()
	save.text = "保存家具布置"
	save.pressed.connect(func(): world._save_layout())
	box.add_child(save)
	var quit := Button.new()
	quit.text = "保存并退出"
	quit.pressed.connect(close)
	box.add_child(quit)
	fps_label = Label.new()
	fps_label.position = Vector2(24, 748)
	fps_label.add_theme_font_size_override("font_size", 13)
	root.add_child(fps_label)
	set_quality(quality)
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func _process(delta: float) -> void:
	elapsed += delta
	if elapsed > 0.5 and fps_label != null:
		fps_label.text = "当前帧率 %d · Esc 暂停 / 画质设置" % Engine.get_frames_per_second()
		elapsed = 0

func set_quality(index: int) -> void:
	quality = clampi(index, 0, 2)
	var viewport := get_viewport()
	viewport.msaa_3d = [Viewport.MSAA_DISABLED, Viewport.MSAA_2X, Viewport.MSAA_4X][quality]
	world.sunlight.directional_shadow_max_distance = [24.0, 40.0, 65.0][quality]
	viewport.positional_shadow_atlas_size = [1024, 2048, 4096][quality]
	for renderer in world.plant_renderers:
		var kind := str(renderer.get_meta("plant_kind", "trees"))
		renderer.visibility_range_end = ([28.0, 42.0, 65.0] if kind == "grass" else [40.0, 60.0, 85.0] if kind == "flowers" else [90.0, 130.0, 180.0])[quality]
		renderer.visibility_range_end_margin = 5.0
	if quality_picker != null: quality_picker.select(quality)

func resume() -> void:
	paused = false
	panel.hide()
	enter_button.text = "继续探索"
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	_save_preferences()

func toggle_pause() -> void:
	if paused: resume()
	else:
		paused = true
		world.edit_mode = false
		world.inspector.hide()
		panel.show()
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		enter_button.grab_focus()

func return_home() -> void:
	world.player.position = Vector3(-1.05, 1, 18)
	world.player.velocity = Vector3.ZERO
	world.player.rotation = Vector3.ZERO
	world.camera.rotation = Vector3(-0.12, 0, 0)
	resume()

func _save_preferences() -> void:
	if world.testing: return
	var settings := ConfigFile.new()
	settings.set_value("display", "quality", quality)
	settings.set_value("controls", "sensitivity", sensitivity)
	settings.save(SETTINGS_PATH)

func close() -> void:
	_save_preferences()
	if not world.testing: world._save_layout()
	get_tree().quit()
