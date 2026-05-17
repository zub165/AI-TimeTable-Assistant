import 'package:flutter_test/flutter_test.dart';
import 'package:voice_time_manager/main.dart';

void main() {
  testWidgets('App loads home title', (WidgetTester tester) async {
    await tester.pumpWidget(const VoiceTimeManagerApp());
    await tester.pump();
    expect(find.text('Voice Time Manager'), findsOneWidget);
  });
}
