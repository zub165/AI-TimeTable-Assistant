import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

/// API base URL — Android emulator uses 10.0.2.2 for host localhost.
String apiBaseUrl() {
  if (Platform.isAndroid) {
    return const String.fromEnvironment(
      'API_URL',
      defaultValue: 'http://10.0.2.2:8100/api',
    );
  }
  return const String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://127.0.0.1:8100/api',
  );
}

class ApiService {
  ApiService({String? baseUrl}) : _base = baseUrl ?? apiBaseUrl();

  final String _base;

  Future<bool> health() async {
    final r = await http.get(Uri.parse('$_base/health/'));
    return r.statusCode == 200;
  }

  Future<Map<String, dynamic>> fetchActivities() async {
    final r = await http.get(Uri.parse('$_base/activities/'));
    if (r.statusCode != 200) throw Exception('Failed to load activities');
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  Future<void> startActivity(String name) async {
    final r = await http.post(
      Uri.parse('$_base/activities/start/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'name': name}),
    );
    if (r.statusCode != 201) {
      throw Exception(jsonDecode(r.body)['error'] ?? 'Start failed');
    }
  }

  Future<void> stopActivity(String name) async {
    final r = await http.post(
      Uri.parse('$_base/activities/stop/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'name': name}),
    );
    if (r.statusCode != 200) {
      throw Exception(jsonDecode(r.body)['error'] ?? 'Stop failed');
    }
  }

  Future<Map<String, dynamic>> fetchSchedule() async {
    final r = await http.get(Uri.parse('$_base/schedule/'));
    if (r.statusCode != 200) throw Exception('Failed to load schedule');
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  Future<void> saveSchedule(Map<String, dynamic> data) async {
    final r = await http.put(
      Uri.parse('$_base/schedule/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(data),
    );
    if (r.statusCode != 200) throw Exception('Failed to save schedule');
  }
}
