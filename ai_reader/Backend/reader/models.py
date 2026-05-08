from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    pass


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    preferred_level = models.CharField(
        max_length=10,
        default="medium"
    )
    font_size = models.IntegerField(default=22)
    line_spacing = models.FloatField(default=1.8)
    bg_color = models.CharField(max_length=20, default="#ffffff")

    def __str__(self):
        return self.user.username