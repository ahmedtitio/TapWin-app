package tap.win.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.offset

/**
 * 3D-style icon "badge": layered gradients + inner highlight + soft shadow ring.
 * Uses real Material vector icons (not emoji) rendered with depth effects.
 */
@Composable
fun Icon3D(
    icon: ImageVector,
    modifier: Modifier = Modifier,
    size: Int = 64,
    colors: List<Color>,
    contentColor: Color = Color.White,
    rotation: Float = 0f,
) {
    val shape = RoundedCornerShape(percent = 28)
    Box(
        modifier = modifier
            .size(size.dp)
            .rotate(rotation),
        contentAlignment = Alignment.Center,
    ) {
        // outer glow / drop layer
        Box(
            modifier = Modifier
                .size(size.dp)
                .background(Brush.linearGradient(colors.map { it.copy(alpha = 0.35f) }), shape)
                .offset(y = (size * 0.08f).dp),
        )
        // main body
        Box(
            modifier = Modifier
                .size(size.dp)
                .background(Brush.linearGradient(colors), shape),
            contentAlignment = Alignment.Center,
        ) {
            // top highlight for glossy 3D feel
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(size.dp / 2.4f)
                    .align(Alignment.TopCenter)
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.White.copy(alpha = 0.30f), Color.Transparent),
                        ),
                        RoundedCornerShape(topStartPercent = 28, topEndPercent = 28),
                    ),
            )
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = contentColor,
                modifier = Modifier.size((size * 0.52f).dp),
            )
        }
    }
}
