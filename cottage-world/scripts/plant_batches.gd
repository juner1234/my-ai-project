extends RefCounted

static func build(root: Node3D) -> Dictionary:
	var sources: Array[MeshInstance3D] = []
	_collect(root, sources)
	var groups := {}
	var meshes := {}
	for source in sources:
		var key := str(source.mesh.get_instance_id())
		for i in source.mesh.get_surface_count():
			var material := source.get_active_material(i)
			key += ":" + str(material.get_instance_id() if material != null else 0)
		if not meshes.has(key):
			var copy := source.mesh.duplicate() as Mesh
			for i in copy.get_surface_count(): copy.surface_set_material(i, source.get_active_material(i))
			meshes[key] = copy
		var at := source.global_position
		var cell := Vector3i(floori(at.x / 12.0), floori(at.y / 12.0), floori(at.z / 12.0))
		var group_key := key + str(cell)
		if not groups.has(group_key): groups[group_key] = {"mesh": meshes[key], "nodes": []}
		groups[group_key]["nodes"].append(source)
	var renderers: Array[GeometryInstance3D] = []
	for entry in groups.values():
		var instances := MultiMesh.new()
		instances.transform_format = MultiMesh.TRANSFORM_3D
		instances.mesh = entry["mesh"]
		instances.instance_count = entry["nodes"].size()
		var renderer := MultiMeshInstance3D.new()
		root.add_child(renderer)
		renderer.multimesh = instances
		var first: MeshInstance3D = entry["nodes"][0]
		var title := str(first.name).to_lower()
		renderer.set_meta("plant_kind", "grass" if title.begins_with("landscape meadow") else "flowers" if title.begins_with("floral") else "trees")
		for i in instances.instance_count:
			var source: MeshInstance3D = entry["nodes"][i]
			instances.set_instance_transform(i, root.global_transform.affine_inverse() * source.global_transform)
			source.queue_free()
		renderers.append(renderer)
	return {"source_count": sources.size(), "batch_count": renderers.size(), "renderers": renderers}

static func _collect(node: Node, sources: Array[MeshInstance3D]) -> void:
	if node is MeshInstance3D and node.mesh != null:
		var title := str(node.name).to_lower().replace("_", " ")
		if title.begins_with("landscape meadow tuft") or title.begins_with("floral ") or title.begins_with("forest fern") or (title.begins_with("landscape ") and title.contains("leaves")):
			sources.append(node)
	for child in node.get_children(): _collect(child, sources)
