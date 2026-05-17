import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

import 'api_service.dart';

void main() {
  runApp(const VoiceTimeManagerApp());
}

class VoiceTimeManagerApp extends StatelessWidget {
  const VoiceTimeManagerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Voice Time Manager',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF4361EE)),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _api = ApiService();
  final _speech = stt.SpeechToText();
  final _nameController = TextEditingController();

  bool _apiOk = false;
  bool _listening = false;
  String _status = 'Loading…';
  List<dynamic> _activities = [];
  List<dynamic> _active = [];
  Map<String, dynamic> _schedule = {
    'client_id': 'default',
    'sleep': 8.0,
    'work': 8.0,
    'eat': 1.5,
    'exercise': 1.0,
    'prayer': 0.5,
    'read': 1.0,
    'entertainment': 2.0,
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      _apiOk = await _api.health();
      final data = await _api.fetchActivities();
      final sched = await _api.fetchSchedule();
      if (!mounted) return;
      setState(() {
        _activities = data['activities'] as List<dynamic>? ?? [];
        _active = data['active_sessions'] as List<dynamic>? ?? [];
        _schedule = {..._schedule, ...sched};
        _status = _apiOk ? 'Connected to API' : 'API unreachable';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _apiOk = false;
        _status = 'API offline (port 8100): $e';
      });
    }
  }

  Future<void> _start([String? name]) async {
    final n = (name ?? _nameController.text).trim();
    if (n.isEmpty) return;
    try {
      await _api.startActivity(n);
      _nameController.clear();
      setState(() => _status = 'Started $n');
      await _load();
    } catch (e) {
      setState(() => _status = '$e');
    }
  }

  Future<void> _stop(String name) async {
    try {
      await _api.stopActivity(name);
      setState(() => _status = 'Stopped $name');
      await _load();
    } catch (e) {
      setState(() => _status = '$e');
    }
  }

  Future<void> _saveSchedule() async {
    try {
      await _api.saveSchedule(_schedule);
      setState(() => _status = 'Schedule saved');
    } catch (e) {
      setState(() => _status = '$e');
    }
  }

  Future<void> _toggleVoice() async {
    if (_listening) return;
    final available = await _speech.initialize();
    if (!available) {
      setState(() => _status = 'Speech not available');
      return;
    }
    setState(() {
      _listening = true;
      _status = 'Listening…';
    });
    await _speech.listen(
      onResult: (result) {
        final text = result.recognizedWords.toLowerCase();
        if (result.finalResult) {
          setState(() => _status = 'Heard: $text');
          if (text.contains('start')) {
            final name = text.split('start').last.trim();
            if (name.isNotEmpty) _start(name);
          } else if (text.contains('stop')) {
            final name = text.split('stop').last.trim();
            if (name.isNotEmpty) _stop(name);
          }
          _speech.stop();
          setState(() => _listening = false);
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Voice Time Manager'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(
              child: Text(
                _apiOk ? 'API ✓' : 'API ✗',
                style: TextStyle(
                  color: _apiOk ? Colors.green.shade100 : Colors.red.shade100,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(_status, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 12),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Activity name',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    onPressed: () => _start(),
                    child: const Text('Start'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _toggleVoice,
                    icon: Icon(_listening ? Icons.mic : Icons.mic_none),
                    label: Text(_listening ? 'Listening' : 'Voice'),
                  ),
                ),
              ],
            ),
            const Divider(height: 32),
            const Text('Active', style: TextStyle(fontWeight: FontWeight.bold)),
            ..._active.map((s) => ListTile(
                  title: Text(s['name'] as String),
                  trailing: TextButton(
                    onPressed: () => _stop(s['name'] as String),
                    child: const Text('Stop'),
                  ),
                )),
            const Text('Completed', style: TextStyle(fontWeight: FontWeight.bold)),
            ..._activities.map((a) => ListTile(
                  title: Text(a['name'] as String),
                  trailing: Text('${(a['duration_hours'] as num).toStringAsFixed(2)} h'),
                )),
            const Divider(height: 32),
            const Text('Daily schedule', style: TextStyle(fontWeight: FontWeight.bold)),
            ...['sleep', 'work', 'eat', 'exercise', 'prayer', 'read', 'entertainment'].map((key) {
              return ListTile(
                title: Text(key[0].toUpperCase() + key.substring(1)),
                subtitle: Slider(
                  value: (_schedule[key] as num?)?.toDouble() ?? 0,
                  min: 0,
                  max: 12,
                  divisions: 48,
                  label: '${(_schedule[key] as num?)?.toStringAsFixed(1) ?? 0} h',
                  onChanged: (v) => setState(() => _schedule[key] = v),
                ),
              );
            }),
            FilledButton(
              onPressed: _saveSchedule,
              child: const Text('Save schedule'),
            ),
          ],
        ),
      ),
    );
  }
}
