import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface Props {
    onPress: () => void;
}

const ExploreCitiesCard = ({ onPress }: Props) => {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <Ionicons name="globe-outline" size={28} color="#c6c6d2ff" style={{ marginBottom: 5 }} />
            <Text style={styles.title}>Explore Cities</Text>
            <Text style={styles.subheader}>DISCOVER VENUES BY LOCATION</Text>
        </TouchableOpacity>
    )
}


export default ExploreCitiesCard
const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 280,
        borderRadius: 14,
        marginTop: 15,
        backgroundColor: "#FFFFFF",
        borderStyle: 'dashed',
        borderColor: "#dcdef9ff",
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontFamily: "LibreBaskervilleItalic",
        fontSize: 20,
        color: 'black',
        alignItems: "center",
        fontStyle: "italic",
        marginBottom: 4,
    },
    subheader: {
        fontSize: 12,
        color: "#9FA1B7",
        alignItems: "center",
    }
})

