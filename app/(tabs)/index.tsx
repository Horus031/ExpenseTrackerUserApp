import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchProjects } from "../../services/api/projectService";
import { Project } from "../../types";

const FAVOURITES_KEY = "@favourites_projects";

export default function App() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [favourites, setFavourites] = useState(new Set<string>());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await loadFavourites();
        await loadProjects();
      } catch (error) {
        console.error("Error loading data:", error);
        alert("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const loadFavourites = async () => {
    try {
      const storedFavs = await AsyncStorage.getItem(FAVOURITES_KEY);
      if (storedFavs !== null) {
        setFavourites(new Set(JSON.parse(storedFavs)));
      }
    } catch (error) {
      console.error("Error loading favourites:", error);
    }
  };

  const saveFavourites = async (newFavourites: Set<string>) => {
    try {
      await AsyncStorage.setItem(
        FAVOURITES_KEY,
        JSON.stringify(Array.from(newFavourites)),
      );
    } catch (error) {
      console.error("Error saving favourites:", error);
    }
  };

  const loadProjects = async () => {
    try {
      const loadedProjects = await fetchProjects();
      setProjects(loadedProjects);
      setFilteredProjects(loadedProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      alert("Failed to load projects. Please check your network connection.");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadProjects();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text) {
      const lowercasedText = text.toLowerCase();
      const filtered = projects.filter(
        (item) =>
          item.name.toLowerCase().includes(lowercasedText) ||
          item.manager.toLowerCase().includes(lowercasedText) ||
          item.code.toLowerCase().includes(lowercasedText),
      );
      setFilteredProjects(filtered);
    } else {
      setFilteredProjects(projects);
    }
  };

  const toggleFavourite = (id: string) => {
    const newFavs = new Set(favourites);
    if (newFavs.has(id)) {
      newFavs.delete(id);
    } else {
      newFavs.add(id);
    }
    setFavourites(newFavs);
    saveFavourites(newFavs);
  };

  const renderProjectItem = ({ item }: { item: Project }) => {
    const isFav = favourites.has(item.id);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/project/[projectId]",
            params: { projectId: item.id },
          })
        }
      >
        <View style={styles.cardContent}>
          <Text style={styles.projectCode}>{item.code}</Text>
          <Text style={styles.projectName}>{item.name}</Text>
          <Text style={styles.projectDescription} numberOfLines={2}>
            {item.description || "No description"}
          </Text>
          <Text style={styles.projectManager}>Manager: {item.manager}</Text>
          <View style={styles.cardFooter}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
            <Text style={styles.budget}>Budget: ${item.budget.toFixed(2)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.favButton}
          onPress={() => toggleFavourite(item.id)}
          activeOpacity={0.7}
        >
          <Text style={[styles.favIcon, isFav && styles.favIconActive]}>
            {isFav ? "★" : "☆"}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Projects</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or code..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1CB0F6" />
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.id}
          renderItem={renderProjectItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1CB0F6"
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No projects found.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  header: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#333333",
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: "#F0F0F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: "#F0F0F0",
  },
  cardContent: {
    flex: 1,
    paddingRight: 10,
  },
  projectCode: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1CB0F6",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  projectName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4B4B4B",
    marginBottom: 6,
  },
  projectDescription: {
    fontSize: 14,
    color: "#888",
    fontWeight: "400",
    marginBottom: 8,
  },
  projectManager: {
    fontSize: 14,
    color: "#A0A0A0",
    fontWeight: "600",
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  statusBadge: {
    backgroundColor: "#E5F6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1CB0F6",
  },
  budget: {
    fontSize: 14,
    fontWeight: "700",
    color: "#27AE60",
  },
  favButton: {
    padding: 8,
  },
  favIcon: {
    fontSize: 32,
    color: "#E5E5E5",
  },
  favIconActive: {
    color: "#FFC800",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
    color: "#999",
    fontWeight: "500",
  },
});
