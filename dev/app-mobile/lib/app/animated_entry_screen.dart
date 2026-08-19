import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

class AnimatedEntryScreen extends StatefulWidget {
  const AnimatedEntryScreen({
    super.key,
    this.logo,
    this.logoSize = 164,
    this.visibleDuration = const Duration(milliseconds: 2200),
    this.onFinished,
    this.backgroundColor = Colors.white,
    this.primaryColor = const Color(0xFF14245C),
    this.secondaryColor = const Color(0xFF8C929E),
  });

  final Widget? logo;
  final double logoSize;
  final Duration visibleDuration;
  final VoidCallback? onFinished;
  final Color backgroundColor;
  final Color primaryColor;
  final Color secondaryColor;

  @override
  State<AnimatedEntryScreen> createState() => _AnimatedEntryScreenState();
}

class _AnimatedEntryScreenState extends State<AnimatedEntryScreen>
    with TickerProviderStateMixin {
  late final AnimationController _entryController;
  late final AnimationController _ambientController;
  late final AnimationController _exitController;
  Timer? _finishTimer;

  @override
  void initState() {
    super.initState();
    _entryController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1250),
    )..forward();
    _ambientController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2600),
    )..repeat();
    _exitController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 460),
    );
    _scheduleFinish();
  }

  @override
  void didUpdateWidget(covariant AnimatedEntryScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.visibleDuration != oldWidget.visibleDuration ||
        widget.onFinished != oldWidget.onFinished) {
      _scheduleFinish();
    }
  }

  void _scheduleFinish() {
    _finishTimer?.cancel();
    if (widget.onFinished == null) return;

    _finishTimer = Timer(widget.visibleDuration, _finish);
  }

  Future<void> _finish() async {
    if (!mounted || _exitController.isCompleted) return;

    await _exitController.forward();
    if (mounted) widget.onFinished?.call();
  }

  @override
  void dispose() {
    _finishTimer?.cancel();
    _entryController.dispose();
    _ambientController.dispose();
    _exitController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final entryCurve = CurvedAnimation(
      parent: _entryController,
      curve: Curves.easeOutCubic,
    );

    return AnimatedBuilder(
      animation: _exitController,
      builder: (context, child) {
        final exitValue = Curves.easeInOutCubic.transform(
          _exitController.value,
        );
        return Opacity(
          opacity: 1 - exitValue,
          child: Transform.scale(scale: 1 + (exitValue * .035), child: child),
        );
      },
      child: ColoredBox(
        color: widget.backgroundColor,
        child: Stack(
          children: [
            Positioned.fill(
              child: AnimatedBuilder(
                animation: _ambientController,
                builder: (context, _) {
                  return CustomPaint(
                    painter: _EntryBackgroundPainter(
                      turn: _ambientController.value,
                      primaryColor: widget.primaryColor,
                      secondaryColor: widget.secondaryColor,
                    ),
                  );
                },
              ),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 34,
                ),
                child: Center(
                  child: FadeTransition(
                    opacity: entryCurve,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0, .18),
                        end: Offset.zero,
                      ).animate(entryCurve),
                      child: ScaleTransition(
                        scale: Tween<double>(begin: .82, end: 1).animate(
                          CurvedAnimation(
                            parent: _entryController,
                            curve: Curves.easeOutBack,
                          ),
                        ),
                        child: _EntryLogoStage(
                          ambient: _ambientController,
                          logo: widget.logo,
                          logoSize: widget.logoSize,
                          primaryColor: widget.primaryColor,
                          secondaryColor: widget.secondaryColor,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EntryBackgroundPainter extends CustomPainter {
  const _EntryBackgroundPainter({
    required this.turn,
    required this.primaryColor,
    required this.secondaryColor,
  });

  final double turn;
  final Color primaryColor;
  final Color secondaryColor;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final ringPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = primaryColor.withValues(alpha: .045);
    final accentPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..strokeCap = StrokeCap.round
      ..color = secondaryColor.withValues(alpha: .09);

    canvas.drawCircle(
      center,
      math.min(size.width, size.height) * .36,
      ringPaint,
    );
    canvas.drawCircle(
      center,
      math.min(size.width, size.height) * .47,
      ringPaint,
    );

    final sweepRect = Rect.fromCircle(
      center: center,
      radius: math.min(size.width, size.height) * .43,
    );
    canvas.drawArc(
      sweepRect,
      (turn * math.pi * 2) - math.pi / 2,
      math.pi * .35,
      false,
      accentPaint,
    );

    final linePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = primaryColor.withValues(alpha: .035);

    for (var i = 0; i < 5; i++) {
      final offset = i * 28.0;
      canvas.drawLine(
        Offset(size.width - 92 + offset, -12),
        Offset(size.width + 18, 98 + offset),
        linePaint,
      );
      canvas.drawLine(
        Offset(-18, size.height - 128 + offset),
        Offset(92 + offset, size.height + 12),
        linePaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _EntryBackgroundPainter oldDelegate) {
    return oldDelegate.turn != turn ||
        oldDelegate.primaryColor != primaryColor ||
        oldDelegate.secondaryColor != secondaryColor;
  }
}

class _EntryLogoStage extends StatelessWidget {
  const _EntryLogoStage({
    required this.ambient,
    required this.logo,
    required this.logoSize,
    required this.primaryColor,
    required this.secondaryColor,
  });

  final Animation<double> ambient;
  final Widget? logo;
  final double logoSize;
  final Color primaryColor;
  final Color secondaryColor;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: ambient,
      builder: (context, child) {
        final wave = math.sin(ambient.value * math.pi * 2);
        return Transform.scale(
          scale: 1 + (wave * .01),
          child: SizedBox.square(
            dimension: logoSize + 88,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CustomPaint(
                  size: Size.square(logoSize + 72),
                  painter: _EntryOrbitPainter(
                    turn: ambient.value,
                    primaryColor: primaryColor,
                    secondaryColor: secondaryColor,
                  ),
                ),
                DecoratedBox(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: primaryColor.withValues(alpha: .10),
                        blurRadius: 46,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                  child: child,
                ),
                CustomPaint(
                  size: Size.square(logoSize + 28),
                  painter: _LogoSweepPainter(
                    turn: ambient.value,
                    color: secondaryColor,
                  ),
                ),
              ],
            ),
          ),
        );
      },
      child: SizedBox.square(
        dimension: logoSize,
        child: FittedBox(
          fit: BoxFit.contain,
          child:
              logo ??
              CHMarkLogo(
                size: logoSize,
                primaryColor: primaryColor,
                secondaryColor: secondaryColor,
              ),
        ),
      ),
    );
  }
}

class _EntryOrbitPainter extends CustomPainter {
  const _EntryOrbitPainter({
    required this.turn,
    required this.primaryColor,
    required this.secondaryColor,
  });

  final double turn;
  final Color primaryColor;
  final Color secondaryColor;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.shortestSide / 2) - 4;
    final rect = Rect.fromCircle(center: center, radius: radius);

    final trackPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = primaryColor.withValues(alpha: .055);
    final innerTrackPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = secondaryColor.withValues(alpha: .075);

    final arcPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 3.2
      ..shader = SweepGradient(
        colors: [
          primaryColor.withValues(alpha: 0),
          primaryColor.withValues(alpha: .82),
          secondaryColor.withValues(alpha: .70),
          primaryColor.withValues(alpha: 0),
        ],
        stops: const [0, .35, .70, 1],
        transform: GradientRotation(turn * math.pi * 2),
      ).createShader(rect);

    canvas.drawCircle(center, radius, trackPaint);
    canvas.drawCircle(center, radius - 19, innerTrackPaint);
    canvas.drawArc(
      rect,
      -math.pi / 2 + (turn * math.pi * 2),
      math.pi * .88,
      false,
      arcPaint,
    );

    final dotAngle = -math.pi / 2 + (turn * math.pi * 2) + (math.pi * .88);
    final dotCenter = Offset(
      center.dx + math.cos(dotAngle) * radius,
      center.dy + math.sin(dotAngle) * radius,
    );
    canvas.drawCircle(
      dotCenter,
      3.8,
      Paint()..color = secondaryColor.withValues(alpha: .78),
    );
  }

  @override
  bool shouldRepaint(covariant _EntryOrbitPainter oldDelegate) {
    return oldDelegate.turn != turn ||
        oldDelegate.primaryColor != primaryColor ||
        oldDelegate.secondaryColor != secondaryColor;
  }
}

class _LogoSweepPainter extends CustomPainter {
  const _LogoSweepPainter({required this.turn, required this.color});

  final double turn;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final sweep = (turn * (size.width + 80)) - 40;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..color = color.withValues(alpha: .20);

    canvas.drawLine(
      Offset(sweep - 18, size.height * .24),
      Offset(sweep + 28, size.height * .76),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _LogoSweepPainter oldDelegate) {
    return oldDelegate.turn != turn || oldDelegate.color != color;
  }
}

class CHMarkLogo extends StatelessWidget {
  const CHMarkLogo({
    super.key,
    this.size = 164,
    this.primaryColor = const Color(0xFF14245C),
    this.secondaryColor = const Color(0xFF8C929E),
  });

  final double size;
  final Color primaryColor;
  final Color secondaryColor;

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: size,
      child: CustomPaint(
        painter: _CHMarkPainter(
          primaryColor: primaryColor,
          secondaryColor: secondaryColor,
        ),
      ),
    );
  }
}

class _CHMarkPainter extends CustomPainter {
  const _CHMarkPainter({
    required this.primaryColor,
    required this.secondaryColor,
  });

  final Color primaryColor;
  final Color secondaryColor;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 100, size.height / 100);

    final leftPaint = Paint()
      ..style = PaintingStyle.fill
      ..color = primaryColor;

    final leftMark = Path()
      ..moveTo(28, 8)
      ..lineTo(86, 8)
      ..lineTo(79, 30)
      ..lineTo(36, 30)
      ..cubicTo(32, 30, 29, 33, 29, 37)
      ..lineTo(29, 63)
      ..cubicTo(29, 67, 32, 70, 36, 70)
      ..lineTo(88, 70)
      ..lineTo(81, 92)
      ..lineTo(28, 92)
      ..cubicTo(13, 92, 5, 82, 5, 67)
      ..lineTo(5, 33)
      ..cubicTo(5, 18, 15, 8, 28, 8)
      ..close();

    final gradientPaint = Paint()
      ..style = PaintingStyle.fill
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Color.lerp(secondaryColor, Colors.white, .45)!,
          secondaryColor,
          Color.lerp(secondaryColor, Colors.black, .16)!,
        ],
      ).createShader(const Rect.fromLTWH(35, 8, 58, 84));

    final bridge = Path()
      ..moveTo(43, 43)
      ..lineTo(71, 43)
      ..lineTo(71, 58)
      ..lineTo(36, 58)
      ..close();

    final rightStem = Path()
      ..moveTo(71, 8)
      ..lineTo(93, 8)
      ..lineTo(93, 72)
      ..cubicTo(93, 84, 85, 92, 72, 92)
      ..lineTo(71, 92)
      ..close();

    canvas.drawPath(leftMark, leftPaint);
    canvas.drawPath(bridge, gradientPaint);
    canvas.drawPath(rightStem, gradientPaint);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _CHMarkPainter oldDelegate) {
    return oldDelegate.primaryColor != primaryColor ||
        oldDelegate.secondaryColor != secondaryColor;
  }
}
