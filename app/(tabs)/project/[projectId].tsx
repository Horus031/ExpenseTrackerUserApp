import { ExpenseManagementComponent } from "@/components/ExpenseManagementComponent";
import { fetchProjectById } from "@/services/api/projectService";
import { Project } from "@/types";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchProjectById(projectId);
        setProject(data);
      } catch (error) {
        console.error("Error loading project detail:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{ title: "Project Detail", headerShown: true }}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1CB0F6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{ title: "Project Detail", headerShown: true }}
        />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Project not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: project.name, headerShown: true }} />

      <View style={styles.content}>
        <View style={styles.detailCard}>
          <Text style={styles.projectCode}>{project.code}</Text>
          <Text style={styles.projectName}>{project.name}</Text>
          <Text style={styles.projectDescription}>
            {project.description || "No description"}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Manager</Text>
            <Text style={styles.metaValue}>{project.manager}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValue}>{project.status}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Start</Text>
            <Text style={styles.metaValue}>{project.startDate || "N/A"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>End</Text>
            <Text style={styles.metaValue}>{project.endDate || "N/A"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Budget</Text>
            <Text style={styles.metaValue}>${project.budget.toFixed(2)}</Text>
          </View>
        </View>

        <ExpenseManagementComponent
          projectId={project.id}
          projectBudget={project.budget}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  content: {
    flex: 1,
  },
  detailCard: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  projectCode: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1CB0F6",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  projectName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#222",
    marginBottom: 8,
  },
  projectDescription: {
    fontSize: 14,
    color: "#555",
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  metaLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  metaValue: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    fontWeight: "500",
  },
});
