# from django.urls import path
# from .views import simplify_api
# from . import views

# urlpatterns = [
#     path('simplify/',views.simplify_api),
#     path("api/behavior", views.log_behavior, name="log_behavior"),
#     path("api/getDifficulty", views.get_difficulty, name="get_difficulty"),
# ]
from django.urls import path
from . import views

urlpatterns = [
    path("simplify/", views.simplify_api, name="simplify_api"),
    path("behavior", views.log_behavior, name="log_behavior"),
    path("getDifficulty", views.get_difficulty, name="get_difficulty"),
]
