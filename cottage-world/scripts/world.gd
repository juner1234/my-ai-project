extends Node3D

var player: CharacterBody3D
var camera: Camera3D
var door: Node3D
var edit_mode := false
var door_open := false
var editables: Array[Node3D] = []
var selected_index := 0
var status: Label
var inspector: PanelContainer
var picker: OptionButton
var fields: Array[SpinBox] = []
var refreshing := false
var testing := false
var test_drive := Vector3.ZERO
const SAVE_PATH := "user://cottage_layout.json"

func _ready() -> void:
	_create_environment()
	var packed = load("res://assets/cottage_environment.glb") as PackedScene
	assert(packed != null, "Cottage GLB must import before launch")
	var environment_model = packed.instantiate()
	add_child(environment_model)
	_add_collisions(environment_model)
	_group_furniture(environment_model)
	_add_prop("res://assets/vendor/Lantern.glb", "木灯具", Vector3(-2.7, 0.5, 4.3), 0.7)
	_add_prop("res://assets/vendor/GlassVaseFlowers.glb", "花瓶", Vector3(1.6, 0.97, -0.2), 0.42)
	_create_door()
	_create_player()
	_create_ui()
	_load_layout(false)
	if "--self-test" in OS.get_cmdline_user_args():
		call_deferred("_self_test")

func _create_environment() -> void:
	var world_env := WorldEnvironment.new()
	var env := Environment.new()
	var sky := Sky.new()
	var atmosphere := ProceduralSkyMaterial.new()
	atmosphere.sky_top_color = Color("8bb0c3")
	atmosphere.sky_horizon_color = Color("e4dcc8")
	atmosphere.ground_bottom_color = Color("596048")
	sky.sky_material = atmosphere
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.6
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.fog_enabled = true
	env.fog_light_color = Color("b9c9bd")
	env.fog_density = 0.007
	world_env.environment = env
	add_child(world_env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-38, -35, 0)
	sun.light_color = Color("fff0d5")
	sun.light_energy = 1.6
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 50
	add_child(sun)
	var glow := OmniLight3D.new()
	glow.position = Vector3(0, 2.8, 0)
	glow.light_color = Color("ffd098")
	glow.light_energy = 2.5
	glow.omni_range = 7
	add_child(glow)

func _add_collisions(root: Node) -> void:
	if root is MeshInstance3D:
		var label_name := str(root.name).to_lower().replace("_", " ")
		if label_name.begins_with("terrain") or label_name.begins_with("foundation") or label_name.contains("wall") or label_name.begins_with("interior floor"):
			root.create_trimesh_collision()
	for child in root.get_children():
		_add_collisions(child)

func _group_furniture(root: Node3D) -> void:
	for config in [["木桌", "table"], ["床", "bed"], ["柜子", "cabinet"]]:
		var group := Node3D.new()
		group.name = config[0]
		add_child(group)
		for child in root.get_children():
			if child is Node3D and str(child.name).to_lower().begins_with(config[1]):
				child.reparent(group, true)
				if child is MeshInstance3D:
					child.create_convex_collision()
		if group.get_child_count() > 0:
			editables.append(group)
		else:
			group.queue_free()

func _add_prop(path: String, title: String, at: Vector3, target_height: float) -> void:
	var packed = load(path) as PackedScene
	if packed == null:
		push_error("Missing vendor asset: " + path)
		return
	var group := Node3D.new()
	group.name = title
	add_child(group)
	var content = packed.instantiate()
	group.add_child(content)
	var bounds := _mesh_bounds(content, Transform3D.IDENTITY)
	var factor := target_height / maxf(bounds.size.y, 0.01)
	content.scale = Vector3.ONE * factor
	content.position = Vector3(-bounds.get_center().x, -bounds.position.y, -bounds.get_center().z) * factor
	group.position = at
	editables.append(group)

func _mesh_bounds(root: Node3D, parent_transform: Transform3D) -> AABB:
	var transform := parent_transform * root.transform
	var bounds := AABB()
	if root is MeshInstance3D and root.mesh != null:
		bounds = transform * root.get_aabb()
	for child in root.get_children():
		if child is Node3D:
			var other := _mesh_bounds(child, transform)
			if other.size.length() > 0:
				bounds = other if bounds.size.length() == 0 else bounds.merge(other)
	return bounds

func _create_door() -> void:
	door = Node3D.new()
	door.position = Vector3(-1.8, 0.3, 3.55)
	add_child(door)
	var panel := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = Vector3(1.42, 2.95, 0.11)
	panel.mesh = mesh
	panel.position = Vector3(0.72, 1.48, 0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color("523c27")
	mat.roughness = 0.85
	panel.material_override = mat
	door.add_child(panel)
	panel.create_trimesh_collision()
	# A gentle entrance ramp allows walking through the doorway without jumping.
	var ramp := MeshInstance3D.new()
	var ramp_mesh := BoxMesh.new()
	ramp_mesh.size = Vector3(1.5, 0.12, 1.8)
	ramp.mesh = ramp_mesh
	ramp.position = Vector3(-1.05, 0.11, 4.4)
	ramp.rotation.x = deg_to_rad(10)
	ramp.material_override = mat
	add_child(ramp)
	ramp.create_trimesh_collision()

func _create_player() -> void:
	player = CharacterBody3D.new()
	player.position = Vector3(-1.05, 1, 9)
	player.floor_snap_length = 0.35
	add_child(player)
	var collider := CollisionShape3D.new()
	var shape := CapsuleShape3D.new()
	shape.radius = 0.25
	shape.height = 1.7
	collider.shape = shape
	collider.position.y = 0.85
	player.add_child(collider)
	camera = Camera3D.new()
	camera.position.y = 1.55
	camera.fov = 68
	player.add_child(camera)
	camera.current = true

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_TAB:
			edit_mode = not edit_mode
			inspector.visible = edit_mode
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE if edit_mode else Input.MOUSE_MODE_CAPTURED
		if event.keycode == KEY_ESCAPE:
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		if event.keycode == KEY_E and not edit_mode:
			if player.position.distance_to(door.position) < 4:
				door_open = not door_open
	if event is InputEventMouseButton and event.pressed and not edit_mode:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED and not edit_mode:
		player.rotate_y(-event.relative.x * 0.0025)
		camera.rotation.x = clampf(camera.rotation.x - event.relative.y * 0.0025, -1.2, 1.2)

func _physics_process(delta: float) -> void:
	if player == null: return
	door.rotation.y = lerp_angle(door.rotation.y, deg_to_rad(100) if door_open else 0.0, minf(1, delta * 5))
	var direction := Vector3.ZERO
	if testing:
		direction = test_drive
	elif not edit_mode:
		direction.x = float(Input.is_physical_key_pressed(KEY_D)) - float(Input.is_physical_key_pressed(KEY_A))
		direction.z = float(Input.is_physical_key_pressed(KEY_S)) - float(Input.is_physical_key_pressed(KEY_W))
		direction = player.basis * direction.normalized()
	player.velocity.x = direction.x * 2.7
	player.velocity.z = direction.z * 2.7
	if not player.is_on_floor(): player.velocity.y -= 12 * delta
	elif Input.is_physical_key_pressed(KEY_SPACE) and not edit_mode: player.velocity.y = 4
	player.move_and_slide()
	if player.position.y < -5: player.position = Vector3(-1.05, 1, 9)

func _create_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var heading := Label.new()
	heading.text = "苔光小屋 · 环境与交互样机"
	heading.position = Vector2(24, 18)
	heading.add_theme_font_size_override("font_size", 25)
	layer.add_child(heading)
	status = Label.new()
	status.text = "点击画面开始观察 · WASD 移动 · 鼠标转向 · 靠近门按 E · Tab 编辑家具 · Esc 释放鼠标"
	status.position = Vector2(24, 57)
	layer.add_child(status)
	inspector = PanelContainer.new()
	inspector.position = Vector2(24, 102)
	inspector.custom_minimum_size = Vector2(270, 380)
	inspector.visible = false
	layer.add_child(inspector)
	var box := VBoxContainer.new()
	inspector.add_child(box)
	picker = OptionButton.new()
	for object in editables: picker.add_item(str(object.name))
	box.add_child(picker)
	picker.item_selected.connect(func(index: int): selected_index = index; _refresh_fields())
	for name_text in ["位置 X", "位置 Y", "位置 Z", "旋转 Y（度）", "整体大小"]:
		var label := Label.new(); label.text = name_text; box.add_child(label)
		var field := SpinBox.new(); field.min_value = -20; field.max_value = 20; field.step = 0.1
		if fields.size() == 3: field.min_value = -180; field.max_value = 180; field.step = 5
		if fields.size() == 4: field.min_value = 0.2; field.max_value = 3; field.step = 0.05
		box.add_child(field); fields.append(field)
		field.value_changed.connect(func(_value: float): _apply_fields())
	var save_button := Button.new(); save_button.text = "保存布局"; box.add_child(save_button)
	save_button.pressed.connect(_save_layout)
	var load_button := Button.new(); load_button.text = "恢复保存的布局"; box.add_child(load_button)
	load_button.pressed.connect(func(): _load_layout(true))
	_refresh_fields()

func _refresh_fields() -> void:
	if editables.is_empty(): return
	refreshing = true
	var object := editables[selected_index]
	var values := [object.position.x, object.position.y, object.position.z, object.rotation_degrees.y, object.scale.x]
	for i in range(fields.size()): fields[i].value = values[i]
	refreshing = false

func _apply_fields() -> void:
	if refreshing or editables.is_empty(): return
	var object := editables[selected_index]
	object.position = Vector3(fields[0].value, fields[1].value, fields[2].value)
	object.rotation_degrees.y = fields[3].value
	object.scale = Vector3.ONE * fields[4].value

func _save_layout() -> void:
	var data := {}
	for object in editables:
		data[str(object.name)] = {"position": [object.position.x, object.position.y, object.position.z], "yaw": object.rotation_degrees.y, "scale": object.scale.x}
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null: status.text = "保存失败：无法写入本地存档"; return
	file.store_string(JSON.stringify(data))
	status.text = "布局已保存到本机"

func _load_layout(show_message: bool) -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		if show_message: status.text = "尚未保存过布局"
		return
	var data = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	if not data is Dictionary: return
	for object in editables:
		var entry = data.get(str(object.name))
		if not entry is Dictionary: continue
		var at = entry.get("position")
		if not at is Array or at.size() != 3: continue
		object.position = Vector3(clampf(float(at[0]), -20, 20), clampf(float(at[1]), -20, 20), clampf(float(at[2]), -20, 20))
		object.rotation_degrees.y = clampf(float(entry.get("yaw", 0)), -180, 180)
		object.scale = Vector3.ONE * clampf(float(entry.get("scale", 1)), 0.2, 3)
	_refresh_fields()
	if show_message: status.text = "已恢复保存布局"

func _self_test() -> void:
	testing = true
	assert(editables.size() >= 5)
	var target := editables[0]
	var original := target.position
	var existing = FileAccess.get_file_as_string(SAVE_PATH) if FileAccess.file_exists(SAVE_PATH) else ""
	target.position += Vector3(0.3, 0, 0)
	_save_layout()
	target.position = original
	_load_layout(false)
	assert(target.position.is_equal_approx(original + Vector3(0.3, 0, 0)))
	target.position = original
	if existing.is_empty(): DirAccess.remove_absolute(SAVE_PATH)
	else:
		var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE); file.store_string(existing)
	# Walk toward a solid wall: it must stop the capsule.
	player.position = Vector3(-2.9, 0.5, 5.2)
	player.velocity = Vector3.ZERO
	test_drive = Vector3(0, 0, -1)
	for i in range(130): await get_tree().physics_frame
	assert(player.position.z > 3.6, "Player crossed a solid front wall")
	# Walk through the actual doorway and ramp into the house.
	player.position = Vector3(-1.05, 0.5, 5.2)
	player.velocity = Vector3.ZERO
	door_open = true
	for i in range(155): await get_tree().physics_frame
	assert(player.position.z < 3.0, "Player could not enter the doorway")
	print("COTTAGE_SELF_TEST_PASSED: geometry, props, edit, persistence, wall collision and entry")
	get_tree().quit()
