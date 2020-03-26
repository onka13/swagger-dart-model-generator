convertFromJson(value, type) {
  if (type == 'DateTime') {
    return value == null ? null : DateTime.parse(value);
  }
  return value;
}

convertToJson(value, type) {
  if (type == 'DateTime') {
    return value == null ? '' : value.toUtc().toIso8601String();
  }
  return value;
}

List<T> convertToList<T>(value) {
  if (value == null) {
    return [];
  }
  return (value as List).map<T>((item) => item as T).toList();
}